function Canvas() {

    // Model
    var canvas_topics = []
    var current_topic

    // Settings
    var canvas_width = 500
    var canvas_height = 600
    var topic_radius = 10

    // View (Canvas)
    var canvas_elem = document.getElementById("canvas")
    var ctx = canvas_elem.getContext("2d")
    ctx.lineWidth = 3
    ctx.strokeStyle = "red"
    ctx.fillStyle = "gray"

    // Events
    $(canvas_elem).click(clicked)
    $(canvas_elem).mousedown(mousedown)
    $(canvas_elem).mousemove(mousemove)
    $(canvas_elem).mouseup(mouseup)

    this.add_document = function(doc, refresh_canvas, x, y) {
        // init geometry
        if (x == undefined && y == undefined) {
            x = canvas_width * Math.random()
            y = canvas_height * Math.random()
        }
        // add to canvas
        canvas_topics.push(new CanvasTopic(doc, x, y))
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
        // remove from GUI
        canvas_topics[i].text_div.remove()
        // remove from model
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

    this.update_document = function(doc) {
        doc_by_id(doc._id).update(doc)
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

    /* Event Handling */

    function clicked(event) {
        var ct = doc_by_position(event)
        // alert("clicked: ct=" + ct)
        if (ct) {
            show_document(ct.doc_id)
            draw()
        }
    }

    function mousedown(event) {
        var ct = doc_by_position(event)
        // alert("mousedown: ct=" + ct)
        if (ct) {
            current_topic = ct
        }
    }

    function mousemove(event) {
        if (current_topic) {
            current_topic.move_to(event)
            draw()
        }
    }

    function mouseup(event) {
        current_topic = null
    }

    /* Helper */

    function doc_index(doc_id) {
        for (var i = 0, ct; ct = canvas_topics[i]; i++) {
            if (ct.doc_id == doc_id) {
                return i
            }
        }
        return -1
    }

    function doc_by_id(doc_id) {
        return canvas_topics[doc_index(doc_id)]
    }

    function doc_by_position(event) {
        cx = event.pageX - canvas_elem.offsetLeft;
        cy = event.pageY - canvas_elem.offsetTop;
        for (var i in canvas_topics) {
            ct = canvas_topics[i];
            if (cx >= ct.x - topic_radius && cx < ct.x + topic_radius &&
                cy >= ct.y - topic_radius && cy < ct.y + topic_radius) {
                //
                return ct
            }
        }
        return null
    }

    /* CanvasTopic */

    function CanvasTopic(doc, x, y) {
        this.doc_id = doc._id;
        this.x = x;
        this.y = y;
        var screen_x = x + canvas_elem.offsetLeft - topic_radius
        var screen_y = y + canvas_elem.offsetTop + 1.5 * topic_radius
        var label = topic_label(doc)
        this.text_div = $("<div>").css({position: "absolute", top: screen_y + "px", left: screen_x + "px", width: "100px"}).text(label)
        $("#context_panel").append(this.text_div)

        this.move_to = function(event) {
            this.x = event.pageX - canvas_elem.offsetLeft
            this.y = event.pageY - canvas_elem.offsetTop
            var screen_x = event.pageX - topic_radius
            var screen_y = event.pageY + 1.5 * topic_radius
            this.text_div.css({top: screen_y + "px", left: screen_x + "px"})
        }
        
        this.update = function(doc) {
            this.text_div.text(topic_label(doc))
        }

        function topic_label(doc) {
            return doc.fields[0].content
        }
    }
}
