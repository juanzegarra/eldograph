import * as graph from './graph_manipulation.js'
import * as read from './getFiles.js'
import * as taxonomy from './taxonomy.js'
import * as draw from './draw.js'

var links;

// get the data
// NOTE: keys here must match the <option value="..."> list in the #taxon
// select exactly, or lookups below silently return undefined.
// não cortar legenda
// susbtituir cor de legenda numeração
// botao de menos

var threshold = 0.1;
var linkDistanceValue = 100;
var chargeValue = -350;
var focus_node = null, highlight_node = null;
var highlight_color = "blue";
var highlight_trans = 0.1;
var text_center = false;
var outline = false;
var default_node_color = "#ccc";
var nominal_stroke = 1.5;
var nominal_text_size = 10;
var json_file = null
var table = document.getElementById("table");

// Kept so a change to the "color by ancestor" dropdown can recolor the
// graph that's already on screen, without having to redraw it.
var lastCircleSelection = null;
var lastTocolor = "fill";
var lastNodesMap = null; // node name -> node object, from the most recent draw()

var input = document.getElementById("busca");
var listaSugestoes = document.getElementById("sugestoes");
var listaSugestoesTaxon = document.getElementById("taxon_select_box");
var profundidade = document.getElementById("depth_n");
let itemSelecionado = null;
var activeIndex = -1;

var taxonSelect = document.getElementById("taxon"); // the element, never reassigned
let selectedTaxonFile = taxonSelect.value;// the string value
var adjecancyMap = null;

// Coloring-by-ancestor state
var colorByTaxon = null;         // currently selected ancestor level, e.g. "family"
var ancestorMap = {};            // node name -> ancestor name, for colorByTaxon
var taxonomyLineage = null;      // raw taxa_to_write_<level>.json: node name -> [id, ancestor names... broad to narrow]
var taxonColorScale = d3.scale.category20b();
var taxonNumbering = {};      // ancestor name -> stable number
var lastTextSelection = null; // next to lastCircleSelection



// Get file with nodes from the selected taxon file, then (once loaded)
// fetch the matching taxonomy-lineage lookup and figure out which
// ancestor levels are available for coloring.
taxonSelect.addEventListener("change", () => {
  listaSugestoesTaxon.innerHTML = '<option value="">— none —</option>';
  colorByTaxon = null;
  ancestorMap = {};
  taxonomyLineage = null;
  selectedTaxonFile = taxonSelect.value;
  read.get_taxon_file(taxonSelect, links, taxonomyLineage);
  taxonomy.populateAncestorLevelDropdown(listaSugestoesTaxon);
  adjecancyMap = graph.buildAdjecancyMap(links)
});

taxonSelect.dispatchEvent(new Event("change"));

// When the user picks an ancestor level, recolor the nodes currently on
// screen using the already-loaded lineage data (no extra fetch needed).
listaSugestoesTaxon.addEventListener("change", () => {
  colorByTaxon = listaSugestoesTaxon.value || null;

  if (!colorByTaxon) {
    ancestorMap = {};
    taxonomy.applyTaxonColoring(ancestorMap, lastCircleSelection, lastTocolor, lastText);
    return;
  }

  if (!taxonomyLineage) {
    console.warn("Taxonomy lineage data not loaded yet — try again in a moment.");
    return;
  }

  ancestorMap = taxonomy.buildAncestorMap(colorByTaxon);
  console.log(ancestorMap);
  taxonomy.applyTaxonColoring(ancestorMap, lastCircleSelection, lastTocolor, lastText);
});

$("form").change(function(event) {

    if (!links) {
        console.warn("No data loaded yet — select a taxon level first.");
        return false;
    }
});


// Extract list of taxa inside a given taxon file (e.g. "genus_results_0.1.json")
input.addEventListener("input", () => {
  itemSelecionado = null;
  activeIndex = -1;
  if(!links) {
    console.warn("No data loaded yet — select a taxon level first.");
    return;
  }

    const termo = input.value.toLowerCase().trim();

    listaSugestoes.innerHTML = "";

    // Always show "All" (displays all taxa in the file)
    const allOption = document.createElement("div");
    allOption.textContent = "All";
    allOption.classList.add("suggestion-item");
    allOption.addEventListener("click", () => {
        itemSelecionado = "all";
        input.value = "All";
        listaSugestoes.innerHTML = "";

    });

    listaSugestoes.appendChild(allOption);

    var filtrados = [];
    var sources = new Set();

    // Filter taxa based on the search term
      links.forEach(link => {
          if (
              link.source.toLowerCase().startsWith(termo) &&
              !sources.has(link.source)
          ) {
              sources.add(link.source);
              filtrados.push(link);
          }
      });

    // Display filtered taxa on susgetoes
    filtrados.forEach(item => {
        const div = document.createElement("div");
        div.textContent = item.source;
        div.classList.add("suggestion-item");
        div.addEventListener("click", () => { itemSelecionado = item.source; input.value = item.source; listaSugestoes.innerHTML = ""; });
        listaSugestoes.appendChild(div);
      });
});

// Closes the suggestion when clicking outside the search box
document.addEventListener("click", (e) => {
if (!document.getElementById("busca-box").contains(e.target)) {
  listaSugestoes.innerHTML = "";
}
});


// Handles keyboard navigation within the suggestion list
input.addEventListener("keydown", (e) => {
  var items = listaSugestoes.querySelectorAll(".suggestion-item");
  if (items.length === 0) return;

  if (e.key === "ArrowDown") {
    e.preventDefault();
    activeIndex = (activeIndex + 1) % items.length;
    highlightActive(items);
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    activeIndex = (activeIndex - 1 + items.length) % items.length;
    highlightActive(items);
  } else if (e.key === "Enter") {
    e.preventDefault(); // stop the form from submitting on Enter — same reload issue as the button
    if (activeIndex >= 0 && activeIndex < items.length) {
      items[activeIndex].click(); // reuses your existing click handler logic
    }
  } else if (e.key === "Escape") {
    listaSugestoes.innerHTML = "";
    activeIndex = -1;
  }
});
// Highlights the active item in the suggestion list
function highlightActive(items) {
  items.forEach((item, i) => {
    item.classList.toggle("active", i === activeIndex);
  });
  if (activeIndex >= 0) {
    items[activeIndex].scrollIntoView({ block: "nearest" });
  }
}

var run_command = document.getElementById("run")


//só rodar se entradas estarem certas

run_command.addEventListener("click", (e) => {
  e.preventDefault();

  console.log("Generating for:", itemSelecionado, "depth:", profundidade.value);

   if (!itemSelecionado) {
     console.warn("No clade selected — click a suggestion from the dropdown first.");
     return;
   }

  if (!itemSelecionado) return;

  var new_links;

  if (itemSelecionado === "all") {
    new_links = links;
  } else if (profundidade.value > 0) {
    new_links = graph.getSubgraph(itemSelecionado, Number(profundidade.value), adjecancyMap);
  } else {
    new_links = shallow_search(links, itemSelecionado);
  }

    draw.renderGraph(new_links);
});


var currentLinks = null;                       // link set behind the graph on screen
var enrichBtn = document.getElementById("enrich");
var derichBtn = document.getElementById("derich");

var enrichHistory = [];

enrichBtn.addEventListener("click", graph.enrich_graph(enrichHistory));
derichBtn.addEventListener("click", graph.derich_graph(enrichHistory));
