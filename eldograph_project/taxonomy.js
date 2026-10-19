// Append elvels of

function populateAncestorLevelDropdown(listaSugestoesTaxon) {
  listaSugestoesTaxon.innerHTML = '<option value="">— none —</option>';

  const idx = taxon_levels.indexOf(taxon_level);
  superiorTaxonLevelsToDisplay = idx > 0 ? taxon_levels.slice(0, idx) : [];

  superiorTaxonLevelsToDisplay.forEach((level) => {
    const opt = document.createElement("option");
    opt.value = level;
    opt.textContent = level.charAt(0).toUpperCase() + level.slice(1);
    listaSugestoesTaxon.appendChild(opt);
  });
}

// Derives a node-name -> ancestor-name lookup for a given rank from the
// already-loaded taxonomyLineage data.
function buildAncestorMap(level){
  var map = {};
  if (!taxonomyLineage || !(level in taxon_columns)) return map;
  var idx = taxon_columns[level];
  Object.keys(taxonomyLineage).forEach(function(nodeName){
    var lineage = taxonomyLineage[nodeName];
    if (lineage && lineage.length > idx) {
      map[nodeName] = lineage[idx];
    }
  });
  return map;
}


function nodeColor(d) {
  if (colorByTaxon && ancestorMap[d.name]) {
    return taxonColorScale(ancestorMap[d.name]);
  }
  if (isNumber(d.score) && d.score >= 0) return color(d.score);
  return default_node_color;
}

// Recolors the currently drawn graph in place (no redraw / no re-layout)
// after the "color by ancestor" dropdown changes.
function applyTaxonColoring(lastCircleSelection) {
  if (!lastCircleSelection) return;
  lastCircleSelection.style(lastTocolor, function(d) { return nodeColor(d); });
  renderTaxonLegend();
}

// Builds { ancestorName: color } for every node currently on screen that
// has an ancestor at the chosen level. Skips nodes with no mapping instead
// of creating a bogus "undefined" legend entry.
// no main variables
function get_taxon_legend(colorByTaxon, lastNodesMap){
    var legend_Obj = {};
    if (!colorByTaxon || !lastNodesMap) return legend_Obj;
    Object.keys(lastNodesMap).forEach(function(nodeName){
        var ancestor = ancestorMap[nodeName];
        if (ancestor) {
            legend_Obj[ancestor] = taxonColorScale(ancestor);
        }
    });
    return legend_Obj;
}

function buildTaxonNumbering(ancestorMap) {
  taxonNumbering = {};
  Array.from(new Set(Object.values(ancestorMap))).sort().forEach(function(name, i) {
    taxonNumbering[name] = i + 1;
  });
  return taxonNumbering;
}

function nodeLabel(d) {
  var anc = colorByTaxon && ancestorMap[d.name];
  return anc ? d.name + " (n" + taxonNumbering[anc] + ")" : d.name;
}

function applyTaxonColoring(ancestorMap, lastCircleSelection, lastTocolor, lastTextSelection) {
  buildTaxonNumbering(ancestorMap);
  if (!lastCircleSelection) return;
  lastCircleSelection.style(lastTocolor, function(d) { return nodeColor(d); });
  if (lastTextSelection) lastTextSelection.text(nodeLabel);
  renderTaxonLegend();
}

// (Re)draws the color legend as a plain HTML overlay on top of #graph —
// not inside the SVG, since <div> isn't a valid SVG element and doesn't
// render/position there. Safe to call any time (after a redraw, or after
// just recoloring via the dropdown) since it always clears the old one first.
function renderTaxonLegend(colorByTaxon, lastNodesMap, ancestorMap){
    d3.select("#graph").selectAll(".color-legend").remove();   // old HTML overlay, if any

    var svgEl = d3.select("svg#graphResult");
    if (svgEl.empty()) return;
    svgEl.selectAll(".color-legend-svg").remove();

    var legendObj = get_taxon_legend(colorByTaxon, lastNodesMap);
    var taxonNumbering = buildTaxonNumbering(ancestorMap)
    var taxonNames = Object.keys(legendObj).sort(function(a, b) {
        return taxonNumbering[a] - taxonNumbering[b];
    });
    if (taxonNames.length === 0) return;

    var svgHeight = +svgEl.attr("height");
    var rowH = 18, pad = 10, maxRows = 16;          // wrap into extra columns after 16 rows
    var rows = Math.min(taxonNames.length, maxRows);
    var cols = Math.ceil(taxonNames.length / maxRows);

    var labels = taxonNames.map(function(t) { return t + " (n" + taxonNumbering[t] + ")"; });
    var colW = Math.max.apply(null, labels.map(function(l) { return l.length; })) * 6 + 30;

    // lower-left corner: 20px from the left edge, 20px above the bottom edge
    var g = svgEl.append("g")
        .attr("class", "color-legend-svg")
        .attr("transform", "translate(20," + (svgHeight - 20 - rows * rowH - 2 * pad) + ")")
        .style("pointer-events", "none");           // don't block dragging nodes underneath

    // background panel so the text stays readable over links
    g.append("rect")
        .attr("width", cols * colW + pad)
        .attr("height", rows * rowH + 2 * pad)
        .attr("rx", 6)
        .style("fill", "#fff")
        .style("fill-opacity", 0.85)
        .style("stroke", "#d0d5dd");

    var items = g.selectAll(".legend-item-svg")
        .data(taxonNames)
        .enter().append("g")
        .attr("transform", function(d, i) {
            var col = Math.floor(i / maxRows), row = i % maxRows;
            return "translate(" + (pad + col * colW) + "," + (pad + row * rowH + rowH / 2) + ")";
        });

    items.append("circle")
        .attr("r", 5)
        .attr("cx", 5)
        .style("fill", function(t) { return legendObj[t]; })
        .style("stroke", "#fff")
        .style("stroke-width", 1);

    items.append("text")
        .attr("x", 16)
        .attr("y", 4)
        .style("font", "11px sans-serif")
        .style("fill", "#1f2430")
        .text(function(t) { return t + " (n" + taxonNumbering[t] + ")"; });
}
