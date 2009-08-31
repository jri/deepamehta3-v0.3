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

    this.add_document = function(doc_id, x, y) {
        // alert("add x=" + x + " y=" + y)
        if (x == undefined && y == undefined) {
            x = canvas_width * Math.random()
            y = canvas_height * Math.random()
        }
        canvas_topics.push(new CanvasTopic(doc_id, x, y))
    }

    this.contains = function(doc_id) {
        for (var i in canvas_topics) {
            ct = canvas_topics[i];
            if (ct.doc_id == doc_id) {
                return true
            }
        }
        return false;
    }

    this.refresh = function() {
        draw()
    }

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

    function CanvasTopic(doc_id, x, y) {
        this.doc_id = doc_id;
        this.x = x;
        this.y = y;
    }
}
