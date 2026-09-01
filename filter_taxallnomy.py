import pandas as pd
from collections import defaultdict
import sys


# Use in lin_name table returned by taxallnomy
taxallnomy_file = sys.argv[1]
taxon_level = sys.argv[2]
list_of_taxa = sys.argv[3:]

map_of_taxa = {"family": 22, "genus" : 26, "class": 11,
    "order": 17, "spORDER": 16, "phylum": 7, "kingdom": 4}
taxa_to_write = {taxa: [] for taxa in list_of_taxa}

def filter_taxallnomy(taxallnomy_file):
    with open(taxallnomy_file, "r") as fin:
        for line in fin:
            fields = line.strip().split("\t")
            for taxa in list_of_taxa:
                if fields[map_of_taxa[taxon_level]] == taxa:
                    taxa_to_write[taxa]
