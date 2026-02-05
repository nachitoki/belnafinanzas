from google.cloud.firestore import Client
from app.services.product_matcher import ProductMatcher
from datetime import datetime, date, time
from typing import Optional
import logging

logger = logging.getLogger(__name__)


class ReceiptProcessor:
    """
    Service for processing receipt confirmations
    
    Converts confirmed receipts into:
    - Transactions (expenses)
    - Product links (normalized)
    - Product prices (historical data)
    """
    
    def __init__(self, db: Client):
        self.db = db
        self.product_matcher = ProductMatcher(db)
    
    def confirm_receipt(
        self,
        receipt_id: str,
        household_id: str,
        corrections: dict,
        user_id: str
    ) -> dict:
        """
        Confirm receipt and create all associated records
        
        Args:
            receipt_id: Receipt document ID
            household_id: Household ID
            corrections: User corrections (store_name, date, total, category_id)
            user_id: User who confirmed
            
        Returns:
            Summary dict with counts of created records
        """
        logger.info(f"Confirming receipt {receipt_id} for household {household_id}")
        
        # Get receipt document
        receipt_ref = self.db.collection('households').document(household_id)\
            .collection('receipts').document(receipt_id)
        receipt_doc = receipt_ref.get()
        
        if not receipt_doc.exists:
            raise ValueError(f"Receipt {receipt_id} not found")
        
        receipt_data = receipt_doc.to_dict()
        
        # Validate status - allow re-confirmation for editing
        if receipt_data['status'] not in ['extracted', 'needs_review', 'confirmed']:
            raise ValueError(f"Receipt status must be 'extracted', 'needs_review', or 'confirmed', got: {receipt_data['status']}")
        
        # Apply user corrections
        store_name = corrections['store_name']
        occurred_on = self._parse_occurred_on(corrections['date'])
        total = corrections['total']
        if isinstance(total, float):
            total = int(round(total))
        category_id = corrections.get('category_id')
        
        # Update items if provided
        if corrections.get('items'):
            self._update_receipt_items(receipt_ref, corrections['items'])
        
        # Get or create store unless unknown/empty
        store_name_value = (store_name or '').strip()
        unknown_store_labels = {'sin nombre', 'desconocida', 'tienda desconocida'}
        if store_name_value and store_name_value.lower() not in unknown_store_labels:
            store_id = self._get_or_create_store(household_id, store_name_value)
        else:
            store_id = None
        
        # Get default category if not provided
        if not category_id:
            category_id = self._get_default_category(household_id)
        
        # Get default account
        account_id = self._get_default_account(household_id)
        
        # Create transaction
        transaction_id = self._create_transaction(
            household_id=household_id,
            occurred_on=occurred_on,
            total=total,
            store_name=store_name,
            category_id=category_id,
            account_id=account_id,
            receipt_id=receipt_id
        )
        
        # Process items: normalize products and create prices
        items_stats = self._process_items(
            receipt_ref=receipt_ref,
            household_id=household_id,
            store_id=store_id,
            occurred_on=occurred_on,
            receipt_id=receipt_id
        )
        
        # Update receipt status and metadata
        receipt_ref.update({
            'status': 'confirmed',
            'store_name': store_name,
            'store_id': store_id,
            'occurred_on': occurred_on,
            'total': total,
            'updated_at': datetime.now()
        })
        
        logger.info(f"Receipt {receipt_id} confirmed successfully")
        
        return {
            'transaction_id': transaction_id,
            'products_linked': items_stats['linked'],
            'products_created': items_stats['created'],
            'prices_created': items_stats['prices']
        }
    
    def _get_or_create_store(self, household_id: str, store_name: str) -> str:
        """Find or create store by name, checking legal names and aliases"""
        stores_ref = self.db.collection('households').document(household_id)\
            .collection('stores')
        
        # 1. Try exact match on 'name' (display_name)
        stores = list(stores_ref.where('name', '==', store_name).limit(1).stream())
        if stores: return stores[0].id
        
        # 2. Try match in 'legal_names' array
        legal_match = list(stores_ref.where('legal_names', 'array_contains', store_name).limit(1).stream())
        if legal_match: return legal_match[0].id

        # 3. Try match in 'aliases' array
        alias_match = list(stores_ref.where('aliases', 'array_contains', store_name).limit(1).stream())
        if alias_match: return alias_match[0].id
        
        # 4. Create new store (Default behavior: display_name = extracted name)
        # Director's instruction: For now, create it. The "Learning Flow" will be added later via Telegram interaction.
        store_data = {
            'name': store_name,
            'legal_names': [store_name], # Assume it might be a legal name
            'aliases': [],
            'city': None,
            'tags': {},
            'created_at': datetime.now()
        }
        
        _, store_ref = stores_ref.add(store_data)
        logger.info(f"Created new store: {store_name}")
        
        return store_ref.id
    
    def _get_default_category(self, household_id: str) -> Optional[str]:
        """Get default 'Súper' category or first expense category"""
        categories_ref = self.db.collection('households').document(household_id)\
            .collection('categories')
        
        # Try to find "Súper" category
        categories = categories_ref.where('kind', '==', 'expense')\
            .where('name', '==', 'Súper').limit(1).stream()
        
        for cat_doc in categories:
            return cat_doc.id
        
        # Fall back to first expense category
        categories = categories_ref.where('kind', '==', 'expense').limit(1).stream()
        
        for cat_doc in categories:
            return cat_doc.id
        
        logger.warning(f"No expense category found for household {household_id}")
        return None
    
    def _get_default_account(self, household_id: str) -> str:
        """Get first active account"""
        accounts_ref = self.db.collection('households').document(household_id)\
            .collection('accounts')
        
        accounts = accounts_ref.where('is_active', '==', True).limit(1).stream()
        
        for account_doc in accounts:
            return account_doc.id
        
        raise ValueError(f"No active account found for household {household_id}")
    
    def _create_transaction(
        self,
        household_id: str,
        occurred_on: datetime,
        total: int,
        store_name: str,
        category_id: str,
        account_id: str,
        receipt_id: str
    ) -> str:
        """Create transaction record (expense)"""
        transaction_data = {
            'occurred_on': occurred_on,
            'amount': -total,  # Negative for expense
            'description': f"Compra {store_name} - {occurred_on}",
            'category_id': category_id,
            'account_id': account_id,
            'status': 'posted',
            'source': 'receipt',
            'receipt_id': receipt_id,
            'created_at': datetime.now()
        }
        
        _, transaction_ref = self.db.collection('households').document(household_id)\
            .collection('transactions').add(transaction_data)
        
        logger.info(f"Transaction created: {transaction_ref.id} (amount: {-total})")
        
        return transaction_ref.id
    
    def _process_items(
        self,
        receipt_ref,
        household_id: str,
        store_id: str,
        occurred_on: datetime,
        receipt_id: str
    ) -> dict:
        """
        Process receipt items: normalize products and create prices
        
        Returns stats: {linked, created, prices}
        """
        items_ref = receipt_ref.collection('items')
        items = items_ref.stream()
        
        linked_count = 0
        created_count = 0
        prices_count = 0
        
        for item_doc in items:
            item_data = item_doc.to_dict()
            name_raw = item_data.get('name_raw')
            name_clean = item_data.get('name_clean')
            name_brand = item_data.get('name_brand')
            matcher_name = name_clean or name_raw or ''
            
            # Find or create product
            product_id = self.product_matcher.find_or_create_product(
                name_raw=matcher_name,
                household_id=household_id
            )
            
            # Update item with product_id
            items_ref.document(item_doc.id).update({'product_id': product_id})
            
            # Track if new or existing
            # (We can't easily tell here, but product_matcher logs it)
            linked_count += 1
            
            # Create product price if we have price data
            if item_data.get('line_total') and item_data.get('qty'):
                self._create_product_price(
                    household_id=household_id,
                    product_id=product_id,
                    store_id=store_id,
                    occurred_on=occurred_on,
                    item_data=item_data,
                    receipt_id=receipt_id
                )
                prices_count += 1
        
        return {
            'linked': linked_count,
            'created': 0,  # Can't track easily without extra query
            'prices': prices_count
        }
    
    def _create_product_price(
        self,
        household_id: str,
        product_id: str,
        store_id: str,
        occurred_on: datetime,
        item_data: dict,
        receipt_id: str
    ) -> None:
        """Create product price record (flat collection for queries)"""
        qty = item_data.get('qty')
        total_price = item_data.get('line_total', 0)
        
        # Calculate unit price only if quantity is present and greater than 0
        unit_price = 0
        if qty is not None and qty > 0:
            unit_price = total_price / qty
        
        price_data = {
            'product_id': product_id,
            'store_id': store_id,
            'date': occurred_on,
            'qty': qty,
            'unit': item_data.get('unit', 'unit'),
            'total_price': total_price,
            'unit_price': unit_price,
            'receipt_id': receipt_id,
            'created_at': datetime.now()
        }
        
        # Add to flat product_prices collection
        self.db.collection('households').document(household_id)\
            .collection('product_prices').add(price_data)
        
        logger.debug(f"Price created: {product_id} @ {store_id} = {total_price}")

    def _update_receipt_items(self, receipt_ref, items: list):
        """Update items subcollection with user corrections"""
        items_col = receipt_ref.collection('items')
        
        for item in items:
            item_data = {
                'name_raw': item['name_raw'],
                'name_clean': item.get('name_clean'),
                'name_brand': item.get('name_brand'),
                'qty': item['qty'],
                'unit_price': item['unit_price'],
                'line_total': item['line_total'],
                # We don't update product_id here, it will be re-matched in _process_items
            }
            
            if item.get('id'):
                # Update existing
                try:
                    items_col.document(item['id']).set(item_data, merge=True)
                except Exception:
                    # Fallback if ID doesn't exist for some reason
                    items_col.add(item_data)
            else:
                # Create new
                items_col.add(item_data)

    def _parse_occurred_on(self, value: str) -> datetime:
        """Parse date string into datetime (UTC, no timezone handling)."""
        try:
            return datetime.fromisoformat(value)
        except Exception:
            pass
        try:
            parsed_date = date.fromisoformat(value)
            return datetime.combine(parsed_date, time.min)
        except Exception:
            return datetime.utcnow()
