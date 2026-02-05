# -*- coding: utf-8 -*-
import os

file_path = r's:\APP FINANZAS FAMILIARES\frontend\src\components\shopping\ShoppingList.jsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

repaired = content.replace('♻ Platos', 'r')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(repaired)

print('Repaired ShoppingList.jsx')
