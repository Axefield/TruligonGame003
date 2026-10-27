import unreal
import os

LOG_PATH = r"C:\Users\p5_pa\AppData\Local\Temp\opencode\dt_create2_log.txt"
log_lines = []

def log(msg):
    log_lines.append(msg)
    try:
        unreal.log("TRULIGON_DT: " + msg)
    except:
        pass

TABLES = [
    ("DT_TruligonCharacters", "DT_TruligonCharacters.csv", "TruligonCharacter"),
    ("DT_TruligonAbilities",  "DT_TruligonAbilities.csv",  "TruligonAbility"),
    ("DT_TruligonRelics",     "DT_TruligonRelics.csv",     "TruligonRelicData"),
    ("DT_TruligonTraits",     "DT_TruligonTraits.csv",     "TruligonTrait"),
    ("DT_TruligonZones",      "DT_TruligonZones.csv",      "TruligonZone"),
    ("DT_TruligonQuests",     "DT_TruligonQuests.csv",     "TruligonQuest"),
]

DEST_PATH = "/Game/Truligon/Data"

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
    
    asset_tools = unreal.AssetToolsHelpers.get_asset_tools()
    log("Starting DataTable create v2")
    
    for asset_name, csv_name, struct_name in TABLES:
        csv_path = os.path.join(csv_dir, csv_name)
        row_struct = find_row_struct(struct_name)
        if not row_struct:
            log("FAIL %s: struct not found" % asset_name)
            continue
        
        # Different API pattern for some UE versions
        try:
            factory = unreal.DataTableFactory()
            factory.struct = row_struct
            new_asset = asset_tools.create_asset(asset_name, DEST_PATH, unreal.DataTable, factory)
            log("Created %s type=%s" % (asset_name, type(new_asset)))
            if new_asset:
                try:
                    new_asset.row_struct = row_struct
                except Exception as e:
                    log("row_struct err: %s" % e)
                try:
                    if hasattr(new_asset, 'empty_table_and_fill_from_csv_file'):
                        new_asset.empty_table_and_fill_from_csv_file(csv_path)
                    elif hasattr(new_asset, 'fill_from_csv_file'):
                        new_asset.fill_from_csv_file(csv_path)
                    else:
                        log("no fill method")
                except Exception as e:
                    log("fill err: %s" % e)
                obj_path = "%s/%s" % (DEST_PATH, asset_name)
                unreal.EditorAssetLibrary.save_asset(obj_path)
                try:
                    row_names = unreal.DataTableFunctionLibrary.get_data_table_row_names(new_asset)
                    log("SAVED %s: %d rows" % (asset_name, len(row_names)))
                except Exception as e:
                    log("row names err: %s" % e)
        except Exception as e:
            log("ERR %s: %s" % (asset_name, e))
    
    log("DONE")
    with open(LOG_PATH, "w") as fh:
        fh.write("\n".join(log_lines))

main()
