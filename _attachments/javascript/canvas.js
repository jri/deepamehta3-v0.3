function Canvas() {

    var canvas_topics = [];

    var canvas_width = 500;
    var canvas_height = 700;
    var topic_radius = 10;

    var canvas_elem = document.getElementById("canvas");
    var ctx = canvas_elem.getContext("2d");
    ctx.lineWidth = 3;
    ctx.strokeStyle = "red";
    ctx.fillStyle = "gray";

    canvas_elem.onclick = clicked;

    this.add_document = function(doc_id, refresh_canvas, x, y) {
        // init geometry
        if (x == undefined && y == undefined) {
            x = canvas_width * Math.random()
            y = canvas_height * Math.random()
        }
        // add to canvas
        canvas_topics.push(new CanvasTopic(doc_id, x, y))
        //
        if (refresh_canvas) {
            this.refresh()
        }
    }

    this.remove_document = function(doc_id, refresh_canvas) {
        var i = doc_index(doc_id)
        if (i == -1) {
            throw "remove_document: document not found on canvas (" + doc_id + ")"
        }
        canvas_topics.splice(i, 1)
        //
        if (current_doc._id == doc_id) {
            current_doc = null
        }
        //
        if (refresh_canvas) {
            this.refresh()
        }
    }

    this.contains = function(doc_id) {
        return doc_index(doc_id) >= 0;
    }

    this.refresh = function() {
        draw()
    }

    /* Private Methods */

    function draw() {
        ctx.clearRect(0, 0, canvas_width, canvas_height)
        for (var i in canvas_topics) {
            ct = canvas_topics[i];
            ctx.beginPath()
            // alert("draw topic=" + JSON.stringify(ct))
            ctx.arc(ct.x, ct.y, topic_radius, 0, 2 * Math.PI, true);
            ctx.fill();
            // highlight
            if (current_doc && current_doc._id == ct.doc_id) {
                ctx.beginPath()
                ctx.arc(ct.x, ct.y, 1.5 * topic_radius, 0, 2 * Math.PI, true);
                ctx.stroke();
            }
        }
    }

    function clicked(event) {
        // alert("clicked(): this=" + this)
        cx = event.pageX - canvas_elem.offsetLeft;
        cy = event.pageY - canvas_elem.offsetTop;
        for (var i in canvas_topics) {
            ct = canvas_topics[i];
            if (cx >= ct.x - topic_radius && cx < ct.x + topic_radius &&
                cy >= ct.y - topic_radius && cy < ct.y + topic_radius) {
                show_document(ct.doc_id)
                draw()
            }
        }
    }

    function doc_index(doc_id) {
        for (var i = 0, ct; ct = canvas_topics[i]; i++) {
            if (ct.doc_id == doc_id) {
                return i
            }
        }
        return -1
    }

    function CanvasTopic(doc_id, x, y) {
        this.doc_id = doc_id;
        this.x = x;
        this.y = y;
    }
}
