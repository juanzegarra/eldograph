//funcao de breadth based search
function getSubgraph(startNode, maxDepth, adjecancyMap, threshold) {
    var visited = new Set();
    var queue = [];
    visited.add(startNode);
    queue.push({ node: startNode, depth: 0 });

    while (queue.length > 0) {
        var current = queue.shift();
        if (current.depth >= maxDepth) continue;

        const neighbors = adjecancyMap.get(current) || [];
      for (let i = 0; i < neighbors.length; i++){

        const edge = neighbors[i];
        if (edge.value < threshold) break;

        if (!visited.has(edge)) {
          visited.add(edge.neighbor);
          queue.push({ node: edge.neighbor, depth: current.depth+1})
        }
      }
  };
  let new_links = get_new_links(visible_Nodes, threshold, adjecancyMap);
    return new_links;
}

// Filters links to only include those between visible nodes
function get_new_links(visible_Nodes, threshold, adjecancyncyMap) {
  var visibleLinks = [];
  visible_Nodes.forEach(function (node) {
    const neighbors = adjacencyMap[node];
    for (const neighbor of neighbors) {
      if (neighbor.value >= threshold) {
        visibleLinks.push({
          source: neighbor.direction === "asSource" ? node : neighbor.neighbor,
          target: neighbor.direction === "asTarget" ? node : neighbor.neighbor,
          value: neighbor.value
        })
      }
      else {
        break
      };
    };
    console.debug("visibleLinks", visibleLinks)
    return visibleLinks;
  })
};

// Performs a shallow search to find links connected to the target node
function shallow_search(adjecancyMap, target, threshold){
      var new_links = [];
      const neighbors = adjecancyMap.get(target) || [];
      for (const neighbor of neighbors) {
        if (neighbor.value < threshold) break;
        new_links.push({
          source: neighbor.direction === "asSource" ? target : neighbor.neighbor,
          target: neighbor.direction === "asTarget" ? target : neighbor.neighbor,
          value: neighbor.value
        })}

      return new_links;
}
// Builds adjecancy map for every node on in links
// each node has this structure Map=[node, [{neighbor, value, direction}]]
function buildAdjencancyMap(links) {
  adjencyMap = new Map();
  links.forEach(function (link) {
    targetInfo = { neighbor: link.target, value: link.value, direction: "asSource" };
    sourceInfo = { neighbor: link.source, value: link.value, direction: "asTarget" };
    if (!adjacencyMap.has(link.source)) {
          adjacencyMap.set(link.source, [targetInfo]);
        } else {
          adjacencyMap.get(link.source).push(targetInfo);
        }

        // 2. Process the target node independently
        if (!adjacencyMap.has(link.target)) {
          adjacencyMap.set(link.target, [sourceInfo]);
        } else {
          adjacencyMap.get(link.target).push(sourceInfo);
        }
      })
    // Sorts the list of neighbor nodes by threshold value for easy enrichment
  adjencyMap.forEach(function (neighbors, node)  {
    neighbors.sort((a, b) => a.value - b.value);
  })
  return adjencyMap;
};

function enrich_graph(lastNodesMap, adjecancyMap, threshold, currentLinks) {

  var visible = new Set(Object.keys(lastNodesMap));

  var bestStrong = null, bestWeak = null;
  visible.forEach(function (node) {
    const neighbors = adjecancyMap.get(node);
    for (const neighbor of neighbors) {

      if (visible.has(neighbor)) continue;
      if (neighbor.value >= threshold) {
        if (!bestStrong || neighbor.value > bestStrong.value) {
          bestStrong = { source: node, target: neighbor.neighbor, value: neighbor.value };
        }
      } else {
        if (!bestWeak || neighbor.value > bestWeak.value) {
          bestWeak = { source: node, target: neighbor.neighbor, value: neighbor.value };
        }
        break

      };
    };


  })
  var best = bestStrong ? bestStrong : bestWeak;
  currentLinks.push(best);
  enrichHistory.push({links: currentLinks, threshold: best.value});
}

function derich_graph(enrichHistory) {
  console.log("displaying previous graph");
  if (enrichHistory.length === 0 || !links) return;

  var last = enrichHistory.pop();


  return last.links, last.threshold;
}
