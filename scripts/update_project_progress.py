import argparse
import json
from datetime import datetime
from pathlib import Path

VALID_STATUSES = {'done', 'inProgress', 'planned'}

def load_progress(path: Path):
    return json.loads(path.read_text(encoding='utf-8'))

def save_progress(path: Path, data):
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')

def apply_updates(progress, updates):
    id_map = {}
    for phase in progress.get('phases', []):
        for task in phase.get('tasks', []):
            id_map[task['id']] = task
    for item in updates:
        task = id_map.get(item['id'])
        if task:
            task['status'] = item['status']

def build_updates(pairs):
    updates = []
    for pair in pairs:
        if ':' not in pair:
            raise ValueError(f"Esperaba formato ID:status, recibí {pair}")
        task_id, status = pair.split(':', 1)
        status = status.strip()
        task_id = task_id.strip()
        if status not in VALID_STATUSES:
            raise ValueError(f"Estado inválido '{status}', válido: {', '.join(VALID_STATUSES)}")
        updates.append({'id': task_id, 'status': status})
    return updates

def summarize(progress):
    total = 0
    done = 0
    for phase in progress.get('phases', []):
        for task in phase.get('tasks', []):
            total += 1
            if task.get('status') == 'done':
                done += 1
    percent = round((done / total) * 100) if total else 0
    in_progress = sum(1 for phase in progress.get('phases', []) for task in phase.get('tasks', []) if task.get('status') == 'inProgress')
    return total, done, in_progress, percent

def main():
    parser = argparse.ArgumentParser(description="Actualizar el JSON de progreso del MVP")
    parser.add_argument("--file", default="frontend/src/data/projectProgress.json", help="Archivo de progreso")
    parser.add_argument("--set", nargs="*", default=[], help="Lista de ID:estado para aplicar (done, inProgress, planned)")
    parser.add_argument("--dry-run", action="store_true", help="Solo muestra el resultado sin escribir")
    args = parser.parse_args()

    path = Path(args.file)
    if not path.exists():
        raise FileNotFoundError(path)

    progress = load_progress(path)
    updates = build_updates(args.set)

    if updates:
        apply_updates(progress, updates)
        progress["updatedAt"] = datetime.utcnow().isoformat() + "Z"
        if not args.dry_run:
            save_progress(path, progress)

    total, done, in_progress, percent = summarize(progress)
    print(f"Progreso general: {percent}% ({done}/{total} done, {in_progress} en progreso)")
    if updates and args.dry_run:
        print("Dry run: no se actualizó el archivo.")

if __name__ == "__main__":
    main()
