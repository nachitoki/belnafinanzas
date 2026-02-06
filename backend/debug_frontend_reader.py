
path = 's:/APP FINANZAS FAMILIARES/frontend/src/components/food/MealCalendar.jsx'
try:
    with open(path, 'r', encoding='utf-8', errors='ignore') as f:
        lines = f.readlines()
        for i, line in enumerate(lines):
            if 'recipes.map' in line or 'recipes.filter' in line:
                print(f"Line {i+1}: {line.strip()}")
                # Print context (next 10 lines)
                for j in range(1, 11):
                    if i + j < len(lines):
                        print(f"    {lines[i+j].strip()}")
except Exception as e:
    print(e)
