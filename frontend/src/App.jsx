import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import Receipts from './components/receipts/Receipts';
import Products from './components/catalog/Products';
import Stores from './components/catalog/Stores';
import Incomes from './components/finance/Incomes';
import Commitments from './components/finance/Commitments';
import Events from './components/finance/Events';
import FinanceHorizon from './components/finance/Horizon';
import Recipes from './components/food/Recipes';
import Inventory from './components/food/Inventory';
import MealCalendar from './components/food/MealCalendar';
import Bitacora from './components/diary/Bitacora';
import BitacoraDetail from './components/diary/BitacoraDetail';
import RoadmapProgress from './components/roadmap/RoadmapProgress';
import Configuracion from './components/settings/Configuracion';
import TopBar from './components/layout/TopBar';
import BottomNav from './components/layout/BottomNav';
import QuickReceiptFab from './components/layout/QuickReceiptFab';
import ScrollToTop from './components/layout/ScrollToTop';

function App() {
  return (
    <Router>
      <ScrollToTop />
      <TopBar />
      <div className="app-shell">
        <div className="app-scroll">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/receipts" element={<Receipts />} />
            <Route path="/products" element={<Products />} />
            <Route path="/stores" element={<Stores />} />
            <Route path="/incomes" element={<Incomes />} />
            <Route path="/commitments" element={<Commitments />} />
            <Route path="/events" element={<Events />} />
            <Route path="/horizon" element={<FinanceHorizon />} />
            <Route path="/recipes" element={<Recipes />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/meal-calendar" element={<MealCalendar />} />
            <Route path="/bitacora" element={<Bitacora />} />
            <Route path="/bitacora/:id" element={<BitacoraDetail />} />
            <Route path="/configuracion" element={<Configuracion />} />
            <Route path="/roadmap-progress" element={<RoadmapProgress />} />
          </Routes>
        </div>
        <QuickReceiptFab />
        <BottomNav />
      </div>
    </Router>
  );
}

export default App;
