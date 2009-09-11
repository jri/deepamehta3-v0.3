function Canvas() {

    // Model
    var canvas_topics = []
    
    // Short-term Interaction State
    var move_in_progress        // true while topic move is in progress
    var relation_in_progress    // true while relation is pulled
    var current_topic           // topic being moved / related
    var rel_x, rel_y            // end point of relation in progress

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
    canvas_elem.oncontextmenu = contextmenu

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

    this.close_context_menu = function() {
        close_context_menu()
    }

    this.begin_relation = function(doc_id) {
        relation_in_progress = true
        current_topic = doc_by_id(doc_id)
    }

    /* --- Private Methods --- */

    function draw() {
        ctx.clearRect(0, 0, canvas_width, canvas_height)
        // relation in progress
        if (relation_in_progress) {
            ctx.beginPath()
            ctx.moveTo(current_topic.x, current_topic.y)
            ctx.lineTo(rel_x, rel_y)
            ctx.stroke()
        }
        // topics
        for (var i in canvas_topics) {
            ct = canvas_topics[i]
            ctx.beginPath()
            // alert("draw topic=" + JSON.stringify(ct))
            ctx.arc(ct.x, ct.y, topic_radius, 0, 2 * Math.PI, true)
            ctx.fill()
            // highlight
            if (current_doc && current_doc._id == ct.doc_id) {
                ctx.beginPath()
                ctx.arc(ct.x, ct.y, 1.5 * topic_radius, 0, 2 * Math.PI, true)
                ctx.stroke()
            }
        }
    }

    close_context_menu = function() {
        $(".contextmenu").remove()
    }

    /* Event Handling */

    function clicked(event) {
        //
        close_context_menu()
        current_topic = null
        //
        var ct = doc_by_position(event)
        // alert("clicked: ct=" + ct + "\nwhich=" + event.which)
        if (relation_in_progress) {
            // end relation in progress
            relation_in_progress = false
            //
            if (ct) {
                create_relation(ct.doc_id)
            } else {
                draw()
            }
        } else if (move_in_progress) {
            // end move
            move_in_progress = false
        } else {
            if (ct) {
                select_document(ct.doc_id)
            }
        }
    }

    function mousedown(event) {
        if (event.which == 1) {
            var ct = doc_by_position(event)
            // alert("mousedown: ct=" + ct + "\nwhich=" + event.which)
            if (ct) {
                current_topic = ct
            }
        }
    }

    function mousemove(event) {
        if (current_topic) {
            if (relation_in_progress) {
                rel_x = cx(event)
                rel_y = cy(event)
            } else {
                move_in_progress = true
                current_topic.move_to(event)
            }
            draw()
        }
    }

    function contextmenu(event) {
        var ct = doc_by_position(event)
        if (ct) {
            //
            select_document(ct.doc_id)
            //
            var impl = implementations[current_doc.implementation]
            var items = impl.context_menu_items()
            var contextmenu = $("<div>").addClass("contextmenu").css({position: "absolute", top: event.pageY + "px", left: event.pageX + "px"})
            for (var i = 0, item; item = items[i]; i++) {
                var a = $("<a>").attr({href: "", onclick: "canvas.close_context_menu(); handle_context_command('" + item.function + "'); return false"}).text(item.label)
                contextmenu.append(a)
            }
            $("#context_panel").append(contextmenu)
        }
        return false
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
        var x = cx(event)
        var y = cy(event)
        for (var i in canvas_topics) {
            ct = canvas_topics[i]
            if (x >= ct.x - topic_radius && x < ct.x + topic_radius &&
                y >= ct.y - topic_radius && y < ct.y + topic_radius) {
                //
                return ct
            }
        }
        return null
    }

    //

    function cx(event) {
        return event.pageX - canvas_elem.offsetLeft
    }

    function cy(event) {
        return event.pageY - canvas_elem.offsetTop
    }

    /* CanvasTopic */

    function CanvasTopic(doc, x, y) {

        this.doc_id = doc._id
        this.x = x;
        this.y = y;
        var screen_x = x + canvas_elem.offsetLeft - topic_radius
        var screen_y = y + canvas_elem.offsetTop + 1.5 * topic_radius
        var label = topic_label(doc)
        this.text_div = $("<div>").css({position: "absolute", top: screen_y + "px", left: screen_x + "px", width: "100px"}).text(label)
        $("#context_panel").append(this.text_div)

        this.move_to = function(event) {
            this.x = cx(event)
            this.y = cy(event)
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
