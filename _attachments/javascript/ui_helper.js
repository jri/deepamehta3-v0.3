function UIHelper() {

    var ui = this



    /***************/
    /*** Buttons ***/
    /***************/


    
    this.button = function(id, handler, label, icon, is_submit) {
        var button = $("#" + id)
        button.addClass("ui-state-default").addClass("ui-corner-all")
        // Note: type="button" is required. Otherwise the button acts as submit button (if contained in a form)
        // Note: pseudo-attribute "submit" TODO: explain
        button.attr({type: "button", submit: is_submit})
        if (icon) {
            var icon_span = $("<span>").addClass("ui-icon").addClass("ui-icon-" + icon)
            icon_span.css({float: "left", "margin-right": "5px"})
            button.append(icon_span)
        }
        button.append(label)
        button.click(handler)
        button.hover(
            function(){ 
                button.addClass("ui-state-hover"); 
            },
            function(){ 
                button.removeClass("ui-state-hover"); 
            }
        )
    }




    /*************/
    /*** Menus ***/
    /*************/



    var menus = {}              // key: menu ID, value: a Menu object

    /**
     * @param   menu_id     The ID of the DOM element to be replaced by the menu-triggering button.
     * @param   handler     The callback function. 2 arguments are passed to it:
     *                      1) The selected menu item (an object with "id" and "label" elements).
     *                      2) The menu ID.
     * @param   items       Optional: The menu items (an array of objects with "id" and "label" elements).
     *                      If not specified the DOM element specified by menu_id is expected to be a <select> element.
     *                      Its <option> elements are taken as menu items.
     * @param   menu_title  Optional: The menu title (string).
     *                      If specified a stateless action-trigger menu with a static menu title is created.
     *                      If not specified a stateful select-like menu is created with the selected item as "menu title".
     */
    this.menu = function(menu_id, handler, items, menu_title) {

        menus[menu_id] = new Menu()

        function Menu() {

            var menu        // jQuery <div> object
            var selection   // selected item (object with "id" and "label" elements)
            var button      // the menu-triggering button (jQuery <button> object)  

            build_menu()
            build_button()

            // replace <select> by button
            $("#" + menu_id).replaceWith(button)
            // add menu to page
            // Note: the menu must added to the page _after_ replacing because it has the same ID as the former <select>.
            $("body").append(menu)

            /**
             * @param   item    object with "id" and "label" elements.
             */
            function select(item) {
                selection = item
                //
                if (!menu_title) {
                    set_button_label(item.label)
                }
            }

            this.get_selection = function() {
                return selection
            }

            function get_item_id(anchor_id) {
                return anchor_id.substring((menu_id + "_item_").length)
            }

            function append_anchor(anchor) {
                menu.append(anchor).append("<br>")
            }

            function build_menu() {
                menu = $("<div>").attr("id", menu_id).addClass("contextmenu").css({position: "absolute"})
                if (items) {
                    $.each(items, function(i, item) {
                        var a = build_menu_item(menu_id, item)
                        append_anchor(a)
                    })
                } else {
                    $("#" + menu_id + " option").each(function() {
                        // Note: "this" references the <option> DOM element.
                        var item = {id: this.value, label: $(this).text()}
                        var a = build_menu_item(menu_id, item)
                        append_anchor(a)
                    })
                }
                menu.hide()
            }

            /**
             * @param   item    object with "id" and "label" elements.
             */
            function build_menu_item(menu_id, item) {
                var id = menu_id + "_item_" + item.id
                return $("<a>").attr({href: "", id: id}).text(item.label).click(process_selection)
            }

            function process_selection() {
                // 1) remember selection
                // Note: "this" references the <a> DOM element.
                var menu_id = $(this).parent().attr("id")
                var item_id = get_item_id(this.id)
                var item_label = $(this).text()
                var item = {id: item_id, label: item_label}
                select(item)
                // 2) hide menu
                hide_menu()
                // 3) call handler
                handler(item, menu_id)
                return false
            }

            function hide_menu() {
                menu.hide()
            }

            function build_button() {
                // Note: type="button" is required. Otherwise the button acts as submit button (if contained in a form)
                button = $("<button>").attr({id: menu_id + "_button", type: "button"}).addClass("ui-state-default").click(show_menu)
                var icon_span = $("<span>").addClass("ui-icon").addClass("ui-icon-triangle-1-s")
                icon_span.css({float: "right", "margin-left": "5px"})
                button.append(icon_span)
                button.append("<span></span>")  // the 2nd span holds the menu title
                button.hover(
                    function(){ 
                        button.addClass("ui-state-hover"); 
                    },
                    function(){ 
                        button.removeClass("ui-state-hover"); 
                    }
                )
                // set button label
                if (menu_title) {
                    set_button_label(menu_title)
                } else {
                    var a = $("a:eq(0)", menu)
                    var item_id = get_item_id(a.attr("id"))
                    var item_label = a.text()
                    select({id: item_id, label: item_label})
                }
            }

            /**
             * Calculates the position of the menu and shows it.
             */
            function show_menu() {
                // Note: "this" references the <button> DOM element.
                var pos = $(this).position()
                var height = $(this).outerHeight()
                // Note: we get the menu ID by removing the "_button" suffix from the button ID.
                // var menu_id = this.id.substring(0, this.id.length - "_button".length)
                menu.css({top: pos.top + height, left: pos.left})
                menu.show()
                return false    // why return false is required? As far as I know <button> has no default behavoir.
            }

            function set_button_label(label) {
                // alert("set_button_label: " + button)
                $("span:eq(1)", button).text(label)
            }
        }
    }

    /**
     * @param   item    object with "id" and "label" elements.
     */
    this.add_menu_item = function(menu_id, item) {
        var a = build_menu_item(menu_id, item)
        menus[menu_id].append_anchor(a)
    }

    this.menu_val = function(menu_id) {
        return menus[menu_id].get_selection()
    }
}
