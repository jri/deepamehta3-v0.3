function Canvas() {

    // Settings
    var canvas_width = 500
    var canvas_height = 600
    var topic_radius = 10
    var topic_color = "gray"
    var active_color = "red"
    var active_topic_width = 3
    var active_assoc_width = 10
    var assoc_color = "gray"
    var assoc_width = 4

    // Model
    var canvas_topics = []
    var canvas_assocs = []
    var next_assoc_id = 1       // ID generator
    
    // View (Canvas)
    var canvas_elem = document.getElementById("canvas")
    var ctx = canvas_elem.getContext("2d")
    ctx.fillStyle = topic_color

    // Events
    $(canvas_elem).click(clicked)
    $(canvas_elem).mousedown(mousedown)
    $(canvas_elem).mousemove(mousemove)
    canvas_elem.oncontextmenu = contextmenu

    // Short-term Interaction State
    var move_in_progress        // true while topic move is in progress
    var relation_in_progress    // true while relation is pulled
    var current_topic           // topic being moved / related
    var rel_x, rel_y            // end point of relation in progress

    this.add_document = function(doc, refresh_canvas, x, y) {
        // init geometry
        if (x == undefined && y == undefined) {
            x = canvas_width * Math.random()
            y = canvas_height * Math.random()
        }
        // add to canvas
        if (!topic_exists(doc._id)) {
            canvas_topics.push(new CanvasTopic(doc, x, y))
        }
        //
        if (refresh_canvas) {
            this.refresh()
        }
    }

    this.add_relation = function(doc1_id, doc2_id, refresh_canvas) {
        // add to canvas
        if (!assoc_exists(doc1_id, doc2_id)) {
            canvas_assocs.push(new CanvasAssoc(doc1_id, doc2_id))
        }
        //
        if (refresh_canvas) {
            this.refresh()
        }
    }

    this.remove_document = function(doc_id, refresh_canvas) {
        var i = topic_index(doc_id)
        // assertion
        if (i == -1) {
            throw "remove_document: document not found on canvas (" + doc_id + ")"
        }
        // update GUI (DOM tree)
        canvas_topics[i].text_div.remove()
        // update model
        canvas_topics.splice(i, 1)
        //
        if (current_doc._id == doc_id) {
            current_doc = null
        }
        // update GUI (canvas)
        if (refresh_canvas) {
            this.refresh()
        }
    }

    this.remove_relation = function(assoc_id, refresh_canvas) {
        var i = assoc_index(assoc_id)
        // assertion
        if (i == -1) {
            throw "remove_relation: association not found on canvas (" + assoc_id + ")"
        }
        // update model
        canvas_assocs.splice(i, 1)
        //
        if (current_rel.id == assoc_id) {
            current_rel = null
        }
        // update GUI
        if (refresh_canvas) {
            this.refresh()
        }
    }

    this.remove_relation_by_topics = function(topic1_id, topic2_id) {
        var i = assoc_index_by_topics(topic1_id, topic2_id)
        if (i >= 0) {
            // update model
            canvas_assocs.splice(i, 1)
        }
    }

    this.update_document = function(doc) {
        doc_by_id(doc._id).update(doc)
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

    /* ---------------------------------------- Private Methods ---------------------------------------- */

    /* Drawing */

    function draw() {
        ctx.clearRect(0, 0, canvas_width, canvas_height)
        // 1) assocs
        for (var i in canvas_assocs) {
            ca = canvas_assocs[i]
            ct1 = doc_by_id(ca.doc1_id)
            ct2 = doc_by_id(ca.doc2_id)
            // hightlight
            if (current_rel && current_rel.id == ca.id) {
                draw_line(ct1.x, ct1.y, ct2.x, ct2.y, active_assoc_width, active_color)
            }
            //
            draw_line(ct1.x, ct1.y, ct2.x, ct2.y, assoc_width, assoc_color)
        }
        // 2) relation in progress
        if (relation_in_progress) {
            draw_line(current_topic.x, current_topic.y, rel_x, rel_y, assoc_width, active_color)
        }
        // 3) topics
        ctx.lineWidth = active_topic_width
        ctx.strokeStyle = active_color
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

    function draw_line(x1, y1, x2, y2, width, color) {
        ctx.lineWidth = width
        ctx.strokeStyle = color
        ctx.beginPath()
        ctx.moveTo(x1, y1)
        ctx.lineTo(x2, y2)
        ctx.stroke()
    }

    /* Event Handling */

    function clicked(event) {
        //
        close_context_menu()
        //
        var ct = doc_by_position(event)
        // alert("clicked: ct=" + ct + "\nwhich=" + event.which)
        if (relation_in_progress) {
            // end relation in progress
            relation_in_progress = false
            //
            if (ct) {
                create_relation(current_doc, ct.doc_id)
                select_document(current_doc._id)
            } else {
                draw()
            }
        } else if (move_in_progress) {
            // end move
            move_in_progress = false
        } else if (ct) {
            select_document(ct.doc_id)
        }
        // remove topic activation
        current_topic = null
        // remove assoc activation
        if (current_rel) {
            current_rel = null
            draw()
        }
    }

    function mousedown(event) {
        if (event.which == 1) {
            var ct = doc_by_position(event)
            // alert("mousedown: which=" + event.which + "\nct=" + ct + "\nca=" + ca)
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
            open_context_menu(items, "topic", event)
        } else {
            var ca = assoc_by_position(event)
            if (ca) {
                current_rel = ca
                draw()
                var items = [{label: "Delete", function: "delete_relation"}]
                open_context_menu(items, "assoc", event)
            }
        }
        return false
    }

    /* Context Menu */

    // type: "topic" / "assoc"
    function open_context_menu(items, type, event) {
        var contextmenu = $("<div>").addClass("contextmenu").css({position: "absolute", top: event.pageY + "px", left: event.pageX + "px"})
        for (var i = 0, item; item = items[i]; i++) {
            switch (type) {
            case "topic":
                var handler = "call_document_function"
                break
            case "assoc":
                var handler = "call_relation_function"
                break
            default:
                alert("open_context_menu: unexpected type \"" + type + "\"")
            }
            var onclick = handler + "('" + item.function + "'); canvas.close_context_menu(); return false"
            var a = $("<a>").attr({href: "", onclick: onclick}).text(item.label)
            contextmenu.append(a)
        }
        $("#context_panel").append(contextmenu)
    }

    function close_context_menu() {
        // remove context menu
        $(".contextmenu").remove()
    }

    /* ---------------------------------------- Helper ---------------------------------------- */

    function topic_index(doc_id) {
        for (var i = 0, ct; ct = canvas_topics[i]; i++) {
            if (ct.doc_id == doc_id) {
                return i
            }
        }
        return -1
    }

    function topic_exists(doc_id) {
        return topic_index(doc_id) >= 0;
    }

    function assoc_index(assoc_id) {
        for (var i = 0, ca; ca = canvas_assocs[i]; i++) {
            if (ca.id == assoc_id) {
                return i
            }
        }
        return -1
    }

    function assoc_exists(topic1_id, topic2_id) {
        return assoc_index_by_topics(topic1_id, topic2_id) >= 0
    }

    function assoc_index_by_topics(topic1_id, topic2_id) {
        for (var i = 0, ca; ca = canvas_assocs[i]; i++) {
            if (ca.doc1_id == topic1_id && ca.doc2_id == topic2_id ||
                ca.doc1_id == topic2_id && ca.doc2_id == topic1_id) {
                return i
            }
        }
        return -1
    }

    function doc_by_id(doc_id) {
        return canvas_topics[topic_index(doc_id)]
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

    function assoc_by_position(event) {
        var x = cx(event)
        var y = cy(event)
        for (var i in canvas_assocs) {
            var ca = canvas_assocs[i]
            var ct1 = doc_by_id(ca.doc1_id)
            var ct2 = doc_by_id(ca.doc2_id)
            // bounding rectangle
            var bx1 = Math.min(ct1.x, ct2.x)
            var bx2 = Math.max(ct1.x, ct2.x)
            var by1 = Math.min(ct1.y, ct2.y)
            var by2 = Math.max(ct1.y, ct2.y)
            var in_bounding = x > bx1 && x < bx2 && y > by1 && y < by2
            if (!in_bounding) {
                continue
            }
            // gradient
            var g1 = (y - ct1.y) / (x - ct1.x)
            var g2 = (y - ct2.y) / (x - ct2.x)
            //
            if (Math.abs(g1 - g2) < 0.1) {
                return ca
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

    function CanvasAssoc(doc1_id, doc2_id) {
        this.id = next_assoc_id++
        this.doc1_id = doc1_id
        this.doc2_id = doc2_id
    }
}
