import renderTaxonLegend from './taxonomy'


// One place that builds the table + graph, so every entry point behaves the same
function renderGraph(new_links) {
  currentLinks = new_links;
  make_table(new_links);
  draw(new_links);
  enrichBtn.disabled = false;
  derichBtn.disabled = enrichHistory.length === 0;
}


// Begins to draw the graph
function draw(links){

	// clear out any previously drawn graph so repeated "Generate Graph"
	// clicks don't stack multiple <svg> elements on top of each other
	d3.select("div#graph").selectAll("svg").remove();
	d3.select("div#graph").selectAll(".color-legend").remove();

	var nodes = {};
	var tempLinks =[];
	var linkedByIndex = {};
	// Compute the distinct nodes from the links.
	links.forEach(function(link) {
		if (link.value >= threshold){
			var cloneLink = $.extend(true, {}, link);
			tempLinks.push(cloneLink);
			linkedByIndex[link.source + "," + link.target] = true;
		}
	});
	tempLinks.forEach(function(link) {
		link.source = nodes[link.source] ||
			(nodes[link.source] = {name: link.source});
		link.target = nodes[link.target] ||
			(nodes[link.target] = {name: link.target});
		link.value = +link.value;
	});

	// Degree count (number of drawn links touching each node) — used for
	// the node tooltip below. Computed from tempLinks so it always matches
	// what's actually on screen (same threshold-filtered set drawn here).
	var nodeDegree = {};
	tempLinks.forEach(function(link) {
		nodeDegree[link.source.name] = (nodeDegree[link.source.name] || 0) + 1;
		nodeDegree[link.target.name] = (nodeDegree[link.target.name] || 0) + 1;
	});



	if (itemSelecionado && itemSelecionado !== "all" && nodes[itemSelecionado]) {
    var targetNode = nodes[itemSelecionado];
    targetNode.x = targetNode.px = width / 2;
    targetNode.y = targetNode.py = height / 2;
    targetNode.fixed = true;
	}

	lastNodesMap = nodes; // so renderTaxonLegend()/applyTaxonColoring() can see the current graph's nodes

	function isConnected(a, b) {
        return linkedByIndex[b.name + "," + a.name]|| a.name == b.name;// || linkedByIndex[a.name + "," + b.name];
    }


	var width = 1200,
		height= 800;

	var force = d3.layout.force()
		.nodes(d3.values(nodes))
		.links(tempLinks)
		.size([width, height])
		.linkDistance(linkDistanceValue)
		.charge(chargeValue)
		.on("tick", tick)
		.start();

	setTimeout(function() {
    force.stop();
	}, 2000);

	// Set the range
	var  v = d3.scale.linear().range([0, 100]);

	// Scale the range of the data
	v.domain([d3.min(tempLinks, function(d) { return d.value; }), d3.max(tempLinks, function(d) { return d.value; })]);
	// asign a type per value to encode opacity
	tempLinks.forEach(function(link) {
		if (v(link.value) <= 25) {
			link.type = "twofive";
		} else if (v(link.value) <= 50 && v(link.value) > 25) {
			link.type = "fivezero";
		} else if (v(link.value) <= 75 && v(link.value) > 50) {
			link.type = "sevenfive";
		} else if (v(link.value) <= 100 && v(link.value) > 75) {
			link.type = "onezerozero";
		}
	});

	var css = {
		twofive:"#bcbcbc",
		fivezero:"#3366ff",
		sevenfive:"#00cc00",
		onezerozero:"#ff0000",
	};

	var svg = d3.select("div#graph").append("svg")
		.attr("width", width)
		.attr("height", height)
		.attr("id", "graphResult");
	var div = d3.select("body").append("div")
	    .attr("class", "tooltip")
	    .style("opacity", 0);
	var div1 = d3.select("body").append("div")
	    .attr("class", "tooltip")
	    .style("opacity", 0);

	var container = svg.append("g").attr("class", "zoom-layer");

	var zoom = d3.behavior.zoom()
    .scaleExtent([0.1, 8])
    .on("zoom", function() {
        container.attr("transform",
            "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
    });

	svg.call(zoom);
	svg.on("dblclick.zoom", null);

	// build the arrow.
	svg.append("svg:defs").selectAll("marker")
		.data(["end"])      // Different link/path types can be defined here
	  .enter().append("svg:marker")    // This section adds in the arrows
		.attr("id", String)
		.attr("viewBox", "0 -5 10 10")
		.attr("refX", 15)
		.attr("refY", -1.5)
		.attr("markerWidth", 6)
		.attr("markerHeight", 6)
		.attr("orient", "auto")
	  .append("svg:path")
		.attr("d", "M0,-5L10,0L0,5");

	// add the links and the arrows
	var path = container.append("svg:g").selectAll("path")
		.data(force.links())
	  .enter().append("svg:path")
		//.attr("style", function(d) { return "fill:none;stroke-width:1.5px;" + css[d.type]; })
		.attr("marker-end", "url(#end)")
		.attr("class", "link")
		.style("fill","none")
		.style("stroke-width",nominal_stroke)
		.style("stroke", function(d) { return css[d.type]; })
		.on("mouseover", function(d) {
		div.html("<b>source</b>: " + d.source.name +
	                 "<br><b>target</b>: " + d.target.name +
	                 "<br><b>value</b>: " + d.value.toFixed(3))
		.style("left", (d3.event.clientX) + "px")
		.style("top", (d3.event.clientY - 28) + "px")
		.style("opacity", 0.9);
		})


	    .on("mouseout", function(d) {
	        div.transition()
	            .duration(500)
	            .style("opacity", 0);
	    });

	// Legend of colors used for taxon-based coloring (rendered as a plain
	// HTML overlay on #graph, not inside the SVG — see renderTaxonLegend()).
	renderTaxonLegend();

	// define the nodes
	var node = container.selectAll(".node")
		.data(force.nodes())
	  .enter().append("g")
		.attr("class", "node")
		.on("click", click)
		.on("dblclick", dblclick)
		.on("mousedown", function() {
			// Without this, a mousedown on a node can also reach the zoom
			// behavior bound on the parent <svg>, so dragging a node ends
			// up panning the whole view instead. Stopping propagation here
			// keeps it local to this node; force.drag (bound right below)
			// still gets the same event since stopPropagation only blocks
			// it from reaching ancestor elements, not sibling listeners.
			d3.event.stopPropagation();
		})
		.call(force.drag);

	// add the nodes
	node.append("circle")
		.attr("r", 5)
		.attr("style", "fill:#ccc;stroke:#fff;stroke-width:1.5px");

	// add the text
	node.append("text")
		.attr("x", 12)
		.attr("dy", ".35em")
		.attr("style", "fill:#000;font:10px sans-serif;pointer-events:none")
		.text(nodeLabel);

	var text = node.selectAll("text")
		.style("font-size", nominal_text_size + "px");

	function zoomToFit(padding) {
        padding = padding || 40;
        var bounds = container.node().getBBox();
        if (bounds.width === 0 || bounds.height === 0) return;

        var scale = Math.min(
            (width - padding * 2) / bounds.width,
            (height - padding * 2) / bounds.height,
            2 // don't zoom in past 2x even for tiny graphs
        );
        var midX = bounds.x + bounds.width / 2;
        var midY = bounds.y + bounds.height / 2;
        var translate = [width / 2 - scale * midX, height / 2 - scale * midY];

        svg.transition().duration(300)
            .call(zoom.translate(translate).scale(scale).event);
   	}

	// add the curvy lines
	var settled = false;
	function tick() {
		path.attr("d", function(d) {
			var dx = d.target.x - d.source.x,
				dy = d.target.y - d.source.y,
				dr = Math.sqrt(dx * dx + dy * dy);
			return "M" +
				d.source.x + "," +
				d.source.y + "A" +
				dr + "," + dr + " 0 0,1 " +
				d.target.x + "," +
				d.target.y;
		});

		node.attr("transform", function(d) {
        return "translate(" + d.x + "," + d.y + ")"; });

    if (!settled && force.alpha() < 0.02) {
        settled = true;
        force.stop();
        zoomToFit();
    };

	}



	// add legend
	var legendData = [
		{pos:0, type:"twofive", value:threshold+" < x < "+v.invert(25).toFixed(2)},
		{pos:1, type:"fivezero", value:v.invert(25).toFixed(2)+" < x < "+v.invert(50).toFixed(2)},
		{pos:2, type:"sevenfive", value:v.invert(50).toFixed(2)+" < x < "+v.invert(75).toFixed(2)},
		{pos:3, type:"onezerozero", value:v.invert(75).toFixed(2)+" < x < "+v.invert(100).toFixed(2)},
	];

	svg.append("svg:g").selectAll("path")
		.attr("class", "legend")
		.data(legendData)
	  .enter().append("svg:path")    // This section adds in the arrows
		.attr("style", function(d){
			return "fill:none;stroke-width:1.5px;stroke:" + css[d.type];
		})
		.attr("d", function(d){
			var position = 25 + (d.pos*20);
			return "M 150 "+position+" l 25 0";
		});
	svg.append("svg:g").selectAll("text")
		.attr("class", "legend")
		.data(legendData)
	  .enter().append("svg:text")
		.attr("x", "200")
		.attr("y", function(d){
			return 25 + (d.pos*20);
		})
		.attr("style", "fill:#000;font:10px sans-serif;pointer-events:none")
		.text(function(d){
			return d.value;
		});


	var tocolor = "fill";
	var towhite = "stroke";
	if (outline) {
		tocolor = "stroke"
		towhite = "fill"
	}

	var circle = node.append("path")
      .attr("d", d3.svg.symbol()
        //.size(function(d) { return Math.PI*Math.pow(size(d.size)||nominal_base_node_size,2); })
        .type(function(d) { return d.type; }))
	.style(tocolor, function(d) { return nodeColor(d); })
    //.attr("r", function(d) { return size(d.size)||nominal_base_node_size; })
	.style("stroke-width", nominal_stroke)
	.style(towhite, "white");

	// keep references so the "color by ancestor" dropdown can recolor
	// this same graph later without a full redraw
	lastCircleSelection = circle;
	lastTextSelection = text;
	lastTocolor = tocolor;

	node.on("mouseover", function(d) {

    set_highlight(d);

    div1.transition()
        .duration(200)
        .style("opacity", 0.9);
    div1.html("<b>name</b>: " + d.name +
              "<br><b>connections</b>: " + (nodeDegree[d.name] || 0))
        .style("left", (d3.event.clientX + 10) + "px")
        .style("top", (d3.event.clientY - 28) + "px");
	})
	.on("mousemove", function() {

    div1
        .style("left", (d3.event.clientX + 10) + "px")
        .style("top", (d3.event.clientY - 28) + "px");

	})
	.on("mouseout", function(d) {

    exit_highlight();

    div1.transition()
        .duration(500)
        .style("opacity", 0);
	});

	d3.select(window).on("mouseup",
		function() {
			if (focus_node!==null){
				focus_node = null;
				if (highlight_trans<1){
					circle.style("opacity", 1);
					text.style("opacity", 1);
					path.style("opacity", 1);
				}
			}
			if (highlight_node === null) exit_highlight();
		});

	function exit_highlight(){
		highlight_node = null;
		if (focus_node===null){
			//svg.style("cursor","move");
			if (highlight_color!="white"){
				circle.style(towhite, "white");
				text.style("font-weight", "normal");
				//path.style("stroke", function(o) {return (isNumber(o.score) && o.score>=0)?color(o.score):default_link_color});
			}
		}
	}

	function set_focus(d){
		if (highlight_trans<1){
			circle.style("opacity", function(o) {
				return isConnected(d, o) ? 1 : highlight_trans;
			});

			text.style("opacity", function(o) {
				return isConnected(d, o) ? 1 : highlight_trans;
			});
			path.style("opacity", function(o) {
				//return o.source.index == d.index || o.target.index == d.index ? 1 : highlight_trans;
				return o.target.index == d.index ? 1 : highlight_trans;
			});
		}
	}


	function set_highlight(d){
		//svg.style("cursor","pointer");
		if (focus_node!==null) d = focus_node;
		highlight_node = d;

		if (highlight_color!="white"){
			  circle.style(towhite, function(o) {
					return isConnected(d, o) ? highlight_color : "white";});
				text.style("font-weight", function(o) {
					return isConnected(d, o) ? "bold" : "normal";});
				//path.style("stroke", function(o) {
				//  return o.source.index == d.index || o.target.index == d.index ? highlight_color : ((isNumber(o.score) && o.score>=0)?color(o.score):default_link_color);
				//});
		}
	}
};





// action to take on mouse click
function click() {
    d3.select(this).select("text").transition()
        .duration(750)
     d3.select(this).select("circle").transition()
        .duration(750)
}

// action to take on mouse double click
function dblclick() {
    d3.select(this).select("circle").transition()
        .duration(750)
    d3.select(this).select("text").transition()
        .duration(750)
}

$( "form" ).change(function( event ) {
	var inthreshold = $( "input#thresholdValueIn" ).val();
	inthreshold = inthreshold/100;
	threshold = inthreshold;

	linkDistanceValue = $( "input#linkValueIn" ).val();

	chargeValue = $( "input#chargeValueIn" ).val()*(-1);

	$( "svg#graphResult").remove();
    return false;
});

function updateTextThreshold(val) {
	val = val/100;
	document.getElementById("thresholdText").value=val;
}

function download(){
	//get svg element.
	var svg = document.getElementById("graphResult");

	//get svg source.
	var serializer = new XMLSerializer();
	var source = serializer.serializeToString(svg);

	//add name spaces.
	if(!source.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)){
		source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
	}
	if(!source.match(/^<svg[^>]+"http\:\/\/www\.w3\.org\/1999\/xlink"/)){
		source = source.replace(/^<svg/, '<svg xmlns:xlink="http://www.w3.org/1999/xlink"');
	}

	//add xml declaration
	source = '<?xml version="1.0" standalone="no"?>\r\n' + source;

	//convert svg source to URI data scheme.
	var url = "data:image/svg+xml;charset=utf-8,"+encodeURIComponent(source);

	//set url value to a element's href attribute.
	window.open(url, '_blank');
	//you can download svg file by right click menu.
}

function isNumber(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
}
