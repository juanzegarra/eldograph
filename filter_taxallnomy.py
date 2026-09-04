map_of_taxa = {"family": 21, "genus" : 25, "class": 10,
    "order": 16, "spORDER": 15, "phylum": 7, "kingdom": 4}



from collections import defaultdict
import sys
import re

'''
#1 1       #2 Dom_in_root     #3 Rea_in_root     #4 Kin_in_root     #5 sbKin_in_root   #6 spPhy_in_root   #7 Phy_in_root
#8 sbPhy_in_root   #9 inPhy_in_root   #10 spCla_in_root   #10 Cla_in_root     #11 sbCla_in_root   #12 inCla_in_root   #13 Coh_in_root
#14 sbCoh_in_root   #15spOrd_in_root   #16 Ord_in_root     #17 sbOrd_in_root   #18 inOrd_in_root   #19 prOrd_in_root   #20 spFam_in_root
#21 Fam_in_root     #22 sbFam_in_root   #23 Tri_in_root     #24 sbTri_in_root   #25 Gen_in_root     #26 sbGen_in_root   #27 Sec_in_root
#28 sbSec_in_root   #29 Ser_in_root     #30 sbSer_in_root   #31 Sgr_in_root     #32 sbSgr_in_root   #33 Spe_in_root     #34 Fsp_in_root
#35 sbSpe_in_root   #36 Var_in_root     #37 sbVar_in_root   #38 For_in_root     #39 Srg_in_root     #40 Srt_in_root     #41 Str_in_root
# #42 Iso_in_root
'''

map_of_taxa = {"family": 21, "genus" : 25, "class": 10,
    "order": 16, "spORDER": 15, "phylum": 7, "kingdom": 4}

def get_taxa_list(files):
    taxa = set()
    pattern =  r'"(?:source|target)":\s*"([^"]+)"'
    for file in files:
        with open(file, "r") as fin:
            for line in fin:
                match = re.search(pattern, line)
                if match:
                    taxa.add(match.group(1))
    return taxa

def filter_taxallnomy(taxallnomy_file):
    with open(taxallnomy_file, "r") as fin:
        for line in fin:
            fields = line.strip().split("\t")
            for taxa in list_of_taxa:
                # Searches the name of input taxa in the column corresponding to the taxon's level, if match, appends the taxon's data to the output dictionary
                # Throws away the taxon's data after the taxon's level column (i.e., the data after the column corresponding to the taxon's level)
                if fields[map_of_taxa[taxon_level]] == taxa:
                    taxa_to_write[taxa] = fields[:map_of_taxa[taxon_level]]
                    break

def write_json(taxa_to_write):
    import json
    with open(f"taxa_to_write_{taxon_level}.json", "w") as fout:
        json.dump(taxa_to_write, fout)

# Use in lin_name table returned by taxallnomy
taxallnomy_file = sys.argv[1]
taxon_level = sys.argv[2]
taxon_files = sys.argv[3:]
list_of_taxa = get_taxa_list(taxon_files)
taxa_to_write = {taxa: [] for taxa in list_of_taxa}
filter_taxallnomy(taxallnomy_file)
write_json(taxa_to_write)
