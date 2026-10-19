import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm';

const files = {
   "genus_results_0.05.json" : "genus",
   "genus_results_0.1.json" : "genus",
   "genus_results_0.json" : "genus",
   "family_results_0.05.json" : "family",
   "family_results_0.1.json" : "family",
   "family_results_0.json" : "family",
   "class_results_0.05.json" : "class",
   "class_results_0.1.json" : "class",
   "class_results_0.json" : "class",
   "order_results_0.05.json" : "order",
   "order_results_0.1.json" : "order",
   "order_results_0.json" : "order",
   "spORDER_results_0.05.json" : "spORDER",
   "spORDER_results_0.1.json" : "spORDER",
   "spORDER_results_0.json" : "spORDER"
};

const taxon_columns = {
  "family": 21,
  "genus": 25,
  "class": 10,
  "order": 16,
  "spORDER": 15,
  "phylum": 7,
  "kingdom": 4
};
// Ordered broad -> narrow, matching the column numbers in taxon_columns
// (kingdom=4 < phylum=7 < class=10 < spORDER=15 < order=16 < family=21 < genus=25).
// Used to figure out which levels are "ancestors" of whichever level is
// currently loaded (so we only offer to color by levels that are
// actually broader than the current one).
const taxon_levels = ["kingdom", "phylum", "class", "spORDER", "order", "family", "genus"];
var taxon_level = null;
var superiorTaxonLevelsToDisplay = null;


// Loads taxa_to_write_<level>.json — produced by filter_taxallnomy.py —
// which maps each node name at this level to an array like:
//   [id, "Domain", "Realm", "Kingdom", ..., "<name at this level>"]
// The name at any broader rank sits at index (taxon_columns[rank] - 1),
// since taxon_columns holds 1-indexed column numbers from the taxallnomy
// table and JS arrays are 0-indexed.

function loadTaxonomyLineage(level) {
  var lineageFile = "taxa_to_write_" + level + ".json";
  let taxonomyLineage;
  d3.json(lineageFile, function (error, data) {
    if (error) {
      console.error("Could not load taxonomy lineage file:", lineageFile, error);
      taxonomyLineage = null;
      return;
    }
    taxonomyLineage = data;
    // in case the user already picked a coloring level before this
    // finished loading, build the map now instead of waiting for another change

    return taxonomyLineage;
  });
}



function get_taxon_file(taxon_file, links, taxonomyLineage){

      d3.json(taxon_file, function(error, data) {

          if (error) {
              console.error("Error loading JSON:", error);
              return;
          }

          links = data;

          console.log("Loaded:", links);
          console.warn("Data loaded successfully.");
          taxon_level = files[taxon_file.value];

          if (!taxon_level) {
            console.warn("No taxon level mapping found for file:", taxon_file.value);
            return;
          }

          taxonomyLineage = loadTaxonomyLineage(taxon_level);

      });

}
