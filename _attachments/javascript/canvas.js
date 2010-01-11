function Canvas() {

    // Settings
    var ACTIVE_COLOR = "red"
    var ACTIVE_TOPIC_WIDTH = 3
    var ACTIVE_ASSOC_WIDTH = 10
    var ASSOC_COLOR = "gray"
    var ASSOC_WIDTH = 4
    var ASSOC_CLICK_TOLERANCE = 0.3
    var CANVAS_ANIMATION_STEPS = 30
    var HIGHLIGHT_DIST = 5
    var LABEL_DIST_Y = 5
    var LABEL_MAX_WIDTH = 120

    // Model
    var canvas_topics
    var canvas_assocs
    var trans_x, trans_y            // canvas translation
    
    // View (Canvas)
    var canvas_width
    var canvas_height
    var cox, coy                    // canvas offset: upper left position of the canvas element
    var ctx                         // the drawing context

    // Short-term Interaction State
    var topic_move_in_progress      // true while topic move is in progress (boolean)
    var assoc_create_in_progress    // true while new association is pulled (boolean)
    var canvas_move_in_progress     // true while canvas translation is in progress (boolean)
    var action_topic                // topic being moved / related (a CanvasTopic)
    var tmp_x, tmp_y                // coordinates while action is in progress
    var animation
    var animation_count

    // build the canvas
    init_model()
    build_view()



    /**********************************************************************************************/
    /**************************************** "Public" API ****************************************/
    /**********************************************************************************************/



    /**
     * @param   refresh_canvas  Optional
     * @param   x               Optional
     * @param   y               Optional
     */
    this.add_topic = function(id, type, label, refresh_canvas, x, y) {
        if (!topic_exists(id)) {
            // init geometry
            if (x == undefined && y == undefined) {
                x = canvas_width * Math.random() - trans_x
                y = canvas_height * Math.random() - trans_y
            }
            // update model
            var ct = new CanvasTopic(id, type, label, x, y)
            canvas_topics.push(ct)
            // trigger hook
            trigger_hook("post_add_topic_to_canvas", ct)
        }
        // update GUI
        if (refresh_canvas) {
            this.refresh()
        }
    }

    this.add_relation = function(id, doc1_id, doc2_id, refresh_canvas) {
        if (!assoc_exists(id)) {
            // update model
            var ca = new CanvasAssoc(id, doc1_id, doc2_id)
            canvas_assocs.push(ca)
            // trigger hook
            trigger_hook("post_add_relation_to_canvas", ca)
        }
        // update GUI
        if (refresh_canvas) {
            this.refresh()
        }
    }

    this.remove_topic = function(id, refresh_canvas) {
        var i = topic_index(id)
        // assertion
        if (i == -1) {
            throw "remove_topic: document not found on canvas (" + id + ")"
        }
        // update model
        var ct = canvas_topics[i]
        canvas_topics.splice(i, 1)
        // update GUI
        ct.label_div.remove()
        if (refresh_canvas) {
            this.refresh()
        }
    }

    /**
     * Removes a relation from the canvas (model) and optionally refreshes the canvas (view).
     * If the relation is not present on the canvas nothing is performed.
     *
     * @param   refresh_canvas  Optional - if true, the canvas is refreshed.
     */
    this.remove_relation = function(id, refresh_canvas) {
        var i = assoc_index(id)
        if (i == -1) {
            return
        }
        // update model
        var ca = canvas_assocs[i]
        canvas_assocs.splice(i, 1)
        //
        if (current_rel_id == id) {
            current_rel_id = null
        }
        // update GUI
        if (refresh_canvas) {
            this.refresh()
        }
        // trigger hook
        trigger_hook("post_remove_relation_from_canvas", ca)
    }

    this.set_topic_label = function(id, label) {
        topic_by_id(id).set_label(label)
    }

    this.focus_topic = function(topic_id) {
        var ct = topic_by_id(topic_id)
        if (ct.x + trans_x < 0 || ct.x + trans_x >= canvas_width || ct.y + trans_y < 0 || ct.y + trans_y >= canvas_height) {
            var dx = (canvas_width / 2 - ct.x - trans_x) / CANVAS_ANIMATION_STEPS
            var dy = (canvas_height / 2 - ct.y - trans_y) / CANVAS_ANIMATION_STEPS
            animation_count = 0;
            animation = setInterval("canvas.animation(" + dx + ", " + dy + ")", 0)
        }
    }

    this.animation = function(dx, dy) {
        translate(dx, dy)
        draw()
        if (++animation_count == CANVAS_ANIMATION_STEPS) {
            clearInterval(animation)
        }
    }

    this.refresh = function() {
        draw()
    }

    this.close_context_menu = function() {
        close_context_menu()
    }

    this.begin_relation = function(doc_id) {
        assoc_create_in_progress = true
        action_topic = topic_by_id(doc_id)
    }

    this.clear = function() {
        // update GUI
        translate(-trans_x, -trans_y)                       // reset translation
        $("#canvas-panel .canvas-topic-label").remove()     // remove label divs
        // update model
        init_model()
    }

    this.rebuild = function() {
        $("#canvas-panel").empty()
        build_view()
        ctx.translate(trans_x, trans_y)
        draw()
        rebuild_topic_labels()
    }



    /*************************************************************************************************/
    /**************************************** Private Methods ****************************************/
    /*************************************************************************************************/



    /**************************************** Drawing ****************************************/

    function draw() {
        ctx.clearRect(-trans_x, -trans_y, canvas_width, canvas_height)
        // 1) assocs
        for (var i in canvas_assocs) {
            var ca = canvas_assocs[i]
            var ct1 = topic_by_id(ca.doc1_id)
            var ct2 = topic_by_id(ca.doc2_id)
            // assertion
            if (!ct1 || !ct2) {
                alert("draw: invalid association " + ca.id + " (endpoint doesn't exist)")
                continue
            }
            // hightlight
            if (current_rel_id == ca.id) {
                draw_line(ct1.x, ct1.y, ct2.x, ct2.y, ACTIVE_ASSOC_WIDTH, ACTIVE_COLOR)
            }
            //
            draw_line(ct1.x, ct1.y, ct2.x, ct2.y, ASSOC_WIDTH, ASSOC_COLOR)
        }
        // 2) relation in progress
        if (assoc_create_in_progress) {
            draw_line(action_topic.x, action_topic.y, tmp_x - trans_x, tmp_y - trans_y, ASSOC_WIDTH, ACTIVE_COLOR)
        }
        // 3) topics
        draw_topics()
    }

    function draw_topics() {
        ctx.lineWidth = ACTIVE_TOPIC_WIDTH
        ctx.strokeStyle = ACTIVE_COLOR
        for (var i in canvas_topics) {
            var ct = canvas_topics[i]
            var w = ct.icon.width
            var h = ct.icon.height
            ctx.drawImage(ct.icon, ct.x - w / 2, ct.y - h / 2)
            // highlight
            if (current_doc && current_doc._id == ct.id) {
                ctx.strokeRect(ct.x - w / 2 - HIGHLIGHT_DIST, ct.y - h / 2 - HIGHLIGHT_DIST, w + 2 * HIGHLIGHT_DIST, h + 2 * HIGHLIGHT_DIST)
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

    /**************************************** Event Handling ****************************************/

    function mousedown(event) {
        if (event.which == 1) {
            tmp_x = cx(event)
            tmp_y = cy(event)
            //
            var ct = topic_by_position(event)
            if (ct) {
                action_topic = ct
            } else if (!assoc_create_in_progress) {
                canvas_move_in_progress = true
            }
        }
    }

    function mousemove(event) {
        if (action_topic || canvas_move_in_progress) {
            if (assoc_create_in_progress) {
                tmp_x = cx(event)
                tmp_y = cy(event)
            } else if (canvas_move_in_progress) {
                var x = cx(event)
                var y = cy(event)
                translate(x - tmp_x, y - tmp_y)
                tmp_x = x
                tmp_y = y
            } else {
                topic_move_in_progress = true
                var x = cx(event)
                var y = cy(event)
                action_topic.move_by(x - tmp_x, y - tmp_y)
                tmp_x = x
                tmp_y = y
            }
            draw()
        }
    }

    function clicked(event) {
        //
        close_context_menu()
        //
        if (assoc_create_in_progress) {
            // end relation in progress
            assoc_create_in_progress = false
            //
            var ct = topic_by_position(event)
            if (ct) {
                var rel = create_relation("Relation", current_doc._id, ct.id)
                canvas.add_relation(rel._id, rel.rel_doc_ids[0], rel.rel_doc_ids[1])
                select_document(current_doc._id)
            } else {
                draw()
            }
        } else if (topic_move_in_progress) {
            // end move
            topic_move_in_progress = false
            // trigger hook
            trigger_hook("post_move_topic_on_canvas", action_topic)
        } else if (canvas_move_in_progress) {
            // end translation
            canvas_move_in_progress = false
        } else {
            var ct = topic_by_position(event)
            if (ct) {
                select_document(ct.id)
            }
        }
        // remove topic activation
        action_topic = null
        // remove assoc activation
        if (current_rel_id) {
            current_rel_id = null
            draw()
        }
    }

    /**************************************** Context Menu ****************************************/

    function contextmenu(event) {
        var ct = topic_by_position(event)
        if (ct) {
            //
            select_document(ct.id)
            //
            var items = trigger_doctype_hook("context_menu_items")
            open_context_menu(items, "topic", event)
        } else {
            var ca = assoc_by_position(event)
            if (ca) {
                current_rel_id = ca.id
                draw()
                var items = [{label: "Delete", handler: "delete_relation"}]
                open_context_menu(items, "assoc", event)
            }
        }
        return false
    }

    // type: "topic" / "assoc"
    function open_context_menu(items, type, event) {
        var contextmenu = $("<div>").addClass("contextmenu").css({position: "absolute", top: event.pageY + "px", left: event.pageX + "px"})
        for (var i = 0, item; item = items[i]; i++) {
            switch (type) {
            case "topic":
                var handler = "trigger_doctype_hook"
                break
            case "assoc":
                var handler = "call_relation_function"
                break
            default:
                alert("open_context_menu: unexpected type \"" + type + "\"")
            }
            var onclick = handler + "('" + item.handler + "'); canvas.close_context_menu(); return false"
            var a = $("<a>").attr({href: "", onclick: onclick}).text(item.label)
            contextmenu.append(a)
        }
        $("#canvas-panel").append(contextmenu)
    }

    function close_context_menu() {
        // remove context menu
        $("#canvas-panel .contextmenu").remove()
    }

    /**************************************** Helper ****************************************/

    /*** Model Helper ***/

    function init_model() {
        canvas_topics = []
        canvas_assocs = []
        trans_x = 0, trans_y = 0
    }

    function topic_index(doc_id) {
        for (var i = 0, ct; ct = canvas_topics[i]; i++) {
            if (ct.id == doc_id) {
                return i
            }
        }
        return -1
    }

    function topic_exists(doc_id) {
        return topic_index(doc_id) >= 0
    }

    function assoc_index(assoc_id) {
        for (var i = 0, ca; ca = canvas_assocs[i]; i++) {
            if (ca.id == assoc_id) {
                return i
            }
        }
        return -1
    }

    function assoc_exists(id) {
        for (var i = 0, ca; ca = canvas_assocs[i]; i++) {
            if (ca.id == id) {
                return true
            }
        }
    }

    function topic_by_id(doc_id) {
        return canvas_topics[topic_index(doc_id)]
    }

    function topic_by_position(event) {
        var x = cx(event, true)
        var y = cy(event, true)
        for (var i = 0, ct; ct = canvas_topics[i]; i++) {
            if (x >= ct.x - ct.width / 2 && x < ct.x + ct.width / 2 &&
                y >= ct.y - ct.height / 2 && y < ct.y + ct.height / 2) {
                //
                return ct
            }
        }
    }

    function assoc_by_position(event) {
        var x = cx(event, true)
        var y = cy(event, true)
        for (var i in canvas_assocs) {
            var ca = canvas_assocs[i]
            var ct1 = topic_by_id(ca.doc1_id)
            var ct2 = topic_by_id(ca.doc2_id)
            // bounding rectangle
            var aw2 = ASSOC_WIDTH / 2   // buffer to make orthogonal associations selectable
            var bx1 = Math.min(ct1.x, ct2.x) - aw2
            var bx2 = Math.max(ct1.x, ct2.x) + aw2
            var by1 = Math.min(ct1.y, ct2.y) - aw2
            var by2 = Math.max(ct1.y, ct2.y) + aw2
            var in_bounding = x > bx1 && x < bx2 && y > by1 && y < by2
            if (!in_bounding) {
                continue
            }
            // gradient
            var g1 = (y - ct1.y) / (x - ct1.x)
            var g2 = (y - ct2.y) / (x - ct2.x)
            // log(g1 + " " + g2 + " -> " + Math.abs(g1 - g2))
            //
            if (Math.abs(g1 - g2) < ASSOC_CLICK_TOLERANCE) {
                return ca
            }
        }
        return null
    }

    /*** GUI Helper ***/

    function build_view() {
        calculate_size()
        var canvas_elem = $("<canvas>").attr({id: "canvas", width: canvas_width, height: canvas_height})
        $("#canvas-panel").append(canvas_elem)
        cox = canvas_elem.offset().left
        coy = canvas_elem.offset().top
        log("Canvas offset: x=" + cox + " y=" + coy)
        ctx = canvas_elem.get(0).getContext("2d")
        // bind events
        canvas_elem.click(clicked)
        canvas_elem.mousedown(mousedown)
        canvas_elem.mousemove(mousemove)
        canvas_elem.get(0).oncontextmenu = contextmenu
    }

    function calculate_size() {
        var w_w = window.innerWidth
        var w_h = window.innerHeight
        var t_h = $("#upper-toolbar").height()
        canvas_width = w_w - detail_panel_width - 36
        canvas_height = w_h - t_h - 60
        log("calculate_size: window size=" + w_w + "x" + w_h + " toolbar height=" + t_h)
        log("..... new canvas size=" + canvas_width + "x" + canvas_height)
    }

    function translate(tx, ty) {
        ctx.translate(tx, ty)
        move_topic_labels_by(tx, ty)
        trans_x += tx
        trans_y += ty
    }

    function move_topic_labels_by(tx, ty) {
         for (var i = 0, ct; ct = canvas_topics[i]; i++) {
             ct.move_label_by(tx, ty)
         }
    }

    function rebuild_topic_labels() {
         for (var i = 0, ct; ct = canvas_topics[i]; i++) {
             ct.build_label()
         }
    }

    function cx(event, consider_translation) {
        return event.pageX - cox - (consider_translation ? trans_x : 0)
    }

    function cy(event, consider_translation) {
        return event.pageY - coy - (consider_translation ? trans_y : 0)
    }

    /*** Helper Classes ***/

    function CanvasTopic(id, type, label, x, y) {

        var icon = get_type_icon(type)
        var w = icon.width
        var h = icon.height

        this.id = id
        this.type = type
        this.label = label
        this.x = x
        this.y = y
        this.icon = icon
        this.width = w
        this.height = h

        // label div
        this.lox = -w / 2                       // label offset
        this.loy = h / 2 + LABEL_DIST_Y         // label offset
        init_label_pos(this)
        build_label(this)

        this.move_to = function(x, y) {
            this.x = x
            this.y = y
            init_label_pos(this)
            this.label_div.css(label_position_css(this))
        }

        this.move_by = function(tx, ty) {
            this.x += tx
            this.y += ty
            this.move_label_by(tx, ty)
        }

        this.move_label_by = function(tx, ty) {
            this.label_x += tx
            this.label_y += ty
            this.label_div.css(label_position_css(this))
        }
        
        this.set_label = function(label) {
            this.label = label
            this.label_div.text(this.label)
        }

        this.build_label = function() {
            build_label(this)
        }

        function init_label_pos(ct) {
            ct.label_x = ct.x + ct.lox + cox + trans_x
            ct.label_y = ct.y + ct.loy + coy + trans_y
        }

        function build_label(ct) {
            // Note: we must add the label div to the document (along with text content and max-width
            // setting) _before_ the clipping is applied. Otherwise the clipping can't be calculated
            // because the size of the label div is unknown.
            ct.label_div = $("<div>").addClass("canvas-topic-label").text(ct.label).css("max-width", LABEL_MAX_WIDTH + "px")
            $("#canvas-panel").append(ct.label_div)
            ct.label_div.css(label_position_css(ct))
        }

        /**
         * Builds the CSS for positioning and clipping the label div.
         */
        function label_position_css(ct) {
            // 1) Positioning
            var css = {position: "absolute", top: ct.label_y + "px", left: ct.label_x + "px"}
            // 2) Clipping
            // Note: we do clip each label div instead of "overflow: hidden" for the context panel
            // because "overflow: hidden" only works with absolute positioning the context panel
            // which in turn has a lot of consequences, e.g. the context menu items doesn't
            // occupy the entire context menu width anymore and I don't know how to fix it.
            var lx = ct.label_x - cox;
            var ly = ct.label_y - coy;
            // Note: if the label div is completely out of sight we must set it to "display: none".
            // Otherwise the document would grow and produce window scrollbars.
            if (lx > canvas_width || ly > canvas_height) {
                css.display = "none"
            } else {
                var lw = ct.label_div.width()
                var lh = ct.label_div.height()
                var top = ly < 0 ? -ly + "px" : "auto"
                var bottom = ly + lh > canvas_height ? canvas_height - ly + "px" : "auto"
                var left = lx < 0 ? -lx + "px" : "auto"
                var right = lx + lw > canvas_width ? canvas_width - lx + "px" : "auto"
                css.clip = "rect(" + top + ", " + right + ", " + bottom + ", " + left + ")"
                css.display = "block"
            }
            //
            return css
        }
    }

    function CanvasAssoc(id, doc1_id, doc2_id) {
        this.id = id
        this.doc1_id = doc1_id
        this.doc2_id = doc2_id
    }
}
