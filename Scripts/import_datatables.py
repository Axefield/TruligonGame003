import unreal
import os
import time

LOG_PATH = r"C:\Users\p5_pa\AppData\Local\Temp\opencode\import_log.txt"

TABLES = [
    ("DT_TruligonCharacters.csv", "TruligonCharacter", "DT_TruligonCharacters"),
    ("DT_TruligonAbilities.csv",  "TruligonAbility",   "DT_TruligonAbilities"),
    ("DT_TruligonRelics.csv",     "TruligonRelicData", "DT_TruligonRelics"),
    ("DT_TruligonTraits.csv",     "TruligonTrait",     "DT_TruligonTraits"),
    ("DT_TruligonZones.csv",      "TruligonZone",      "DT_TruligonZones"),
    ("DT_TruligonQuests.csv",     "TruligonQuest",     "DT_TruligonQuests"),
]

DEST_PATH = "/Game/Truligon/Data"

log_lines = []

def log(msg):
    log_lines.append(msg)
    try:
        unreal.log("TRULIGON_IMPORT: " + msg)
    except:
        pass

def find_row_struct(struct_name):
    candidates = [struct_name, "F" + struct_name]
    for candidate in candidates:
        found = unreal.find_object(None, "/Script/GameAnimationSample." + candidate)
        if found:
            return found
    return None

def main():
    project_dir = unreal.Paths.project_dir()
    csv_dir = os.path.join(project_dir, "Content", "Truligon", "Data")
    log("CSV dir: %s" % csv_dir)
    log("Dest: %s" % DEST_PATH)

    asset_tools = unreal.AssetToolsHelpers.get_asset_tools()
    failures = []

    for csv_name, struct_name, asset_name in TABLES:
        csv_path = os.path.join(csv_dir, csv_name)
        if not os.path.exists(csv_path):
            log("SKIP %s - missing" % csv_name)
            failures.append(csv_name)
            continue

        row_struct = find_row_struct(struct_name)
        if not row_struct:
            log("FAIL %s - struct %s not found" % (csv_name, struct_name))
            failures.append(csv_name)
            continue

        try:
            # Try alternative import approach
            factory = unreal.DataTableFactory()
            factory.struct = row_struct
            
            task = unreal.AssetImportTask()
            task.set_editor_property('filename', csv_path)
            task.set_editor_property('destination_path', DEST_PATH)
            task.set_editor_property('destination_name', asset_name)
            task.set_editor_property('automated', True)
            task.set_editor_property('replace_existing', True)
            task.set_editor_property('save', True)
            task.set_editor_property('factory', factory)
            
            asset_tools.import_asset_tasks([task])
            time.sleep(0.5)
            
            obj_path = "%s/%s" % (DEST_PATH, asset_name)
            data_table = unreal.load_asset(obj_path)
            if data_table:
                try:
                    row_names = unreal.DataTableFunctionLibrary.get_data_table_row_names(data_table)
                    log("OK %s (%d rows)" % (asset_name, len(row_names)))
                except:
                    log("OK %s (loaded)" % asset_name)
            else:
                log("FAIL %s - not loaded" % asset_name)
                failures.append(csv_name)
        except Exception as e:
            log("ERR %s: %s" % (csv_name, e))
            failures.append(csv_name)

    log("DONE. failures=%d" % len(failures))
    with open(LOG_PATH, "w") as fh:
        fh.write("\n".join(log_lines))

main()
