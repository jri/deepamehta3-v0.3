function UIHelper() {



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
        add_hover_effect(button)
    }




    /*************/
    /*** Menus ***/
    /*************/



    var menus = {}          // key: menu ID, value: a Menu object

    /**
     * @param   menu_id     The Menu ID. Used to identify the menu for subsequent calls, e.g. for adding items to it.
     *                      If a DOM element with such an ID exists it is replaced by the menu-triggering button.
     *                      If no such DOM element exists, the caller is responsible for adding the menu-triggering button
     *                      to the DOM tree.
     * @param   handler     Optional: The callback function. 2 arguments are passed to it:
     *                      1) The selected menu item (an object with "id" and "label" elements).
     *                      2) The menu ID.
     *                      If not specified your application can not react on the menu selection, which is
     *                      reasonable in case of stateful select-like menus.
     * @param   items       Optional: The menu items (an array of objects with "id" and "label" elements).
     *                      If not specified the DOM element specified by menu_id is expected to be a <select> element.
     *                      Its <option> elements are taken as menu items.
     * @param   menu_title  Optional: The menu title (string).
     *                      If specified a stateless action-trigger menu with a static menu title is created.
     *                      If not specified a stateful select-like menu is created with the selected item as "menu title".
     *
     * @return              The menu-triggering button (a jQuery object).
     */
    this.menu = function(menu_id, handler, items, menu_title) {

        menus[menu_id] = new Menu()
        return menus[menu_id].button

        function Menu() {

            var menu        // jQuery <div> object
            var button      // the menu-triggering button (jQuery <button> object)
            var selection   // selected item (object with "id" and "label" elements). Used only for stateful select-like menus.

            // Note: the button must be build _before_ the menu is build
            // because adding menu items might affect the button label (in case of a stateful select-like menu).
            build_button()
            build_menu()
            // Note: the button must be added to the page _after_ the menu ís build
            // because the menu might rely on the placeholder element (in case the menu is build from a <select> element).
            replace_button_placeholder()

            /****************************** "Public" API ******************************/

            /**
             * @param   item    The menu item to add (object with "id" (optional) and "label" elements).
             *                  If "id" is not specified "undefined" (string) is assumed when this item is exposed
             *                  (via callback or "get_selection").
             */
            this.add_item = function(item) {
                add_item(item)
            }

            this.add_separator = function() {
                menu.append("<hr>")
            }

            this.empty = function() {
                menu.empty()
                remove_selection()
            }

            this.get_selection = function() {
                return selection
            }

            this.button = button

            /****************************** The Menu ******************************/

            function build_menu() {
                menu = $("<div>").addClass("contextmenu").css({position: "absolute"})
                if (items) {
                    $.each(items, function(i, item) {
                        add_item(item)
                    })
                } else {
                    $("#" + menu_id + " option").each(function() {
                        // Note: "this" references the <option> DOM element.
                        add_item({id: this.value, label: $(this).text()})
                    })
                }
                hide()
                // add menu to page
                $("body").append(menu)
            }

            /**
             * @param   item    object with "id" (optional) and "label" elements.
             */
            function add_item(item) {
                // alert("add_item: menu_id=" + menu_id + "\n" + JSON.stringify(item))
                var anchor_id = menu_id + "_item_" + item.id
                var anchor = $("<a>").attr({href: "", id: anchor_id}).text(item.label).click(process_selection)
                menu.append(anchor).append("<br>")
                // select the item if there is no selection yet
                if (!selection) {
                    // Note: this sets also the button label (in case of stateful select-like menus)
                    select_item(item)
                }
            }

            /**
             * @param   item    object with "id" and "label" elements.
             */
            function select_item(item) {
                // Note: only select-like menus have selection state.
                if (!menu_title) {
                    selection = item
                    set_button_label(item.label)
                }
            }

            /**
             * ### FIXME: not used for DeepaMehta 3
             *
             * @param   index   the index of the item to select. Starts with 0. Note: separators do not count.
             *                  If no such item exists nothing is performed.
             */
            function select(index) {
                var a = $("a:eq(" + index + ")", menu)
                // Note: the item may not exist (e.g. if the menu is empty)
                if (a.length) {
                    select_item(get_item(a))
                }
            }

            function remove_selection() {
                selection = null
            }

            /**
             * @param   anchor      the <a> jQuery object
             * @return              the menu item (object with "id" and "label" elements)
             */
            function get_item(anchor) {

                var item_id = get_item_id(anchor.attr("id"))
                var item_label = anchor.text()
                var item = {id: item_id, label: item_label}
                return item

                function get_item_id(anchor_id) {
                    return anchor_id.substring((menu_id + "_item_").length)
                }
            }

            function process_selection() {
                // 1) remember selection
                // Note: "this" references the <a> DOM element.
                var item = get_item($(this))
                select_item(item)
                // 2) hide menu
                hide()
                // 3) call handler
                if (handler) {
                     handler(item, menu_id)
                }
                return false
            }

            /**
             * Calculates the position of the menu and shows it.
             */
            function show() {
                // Note: "this" references the <button> DOM element.
                var pos = $(this).position()
                var height = $(this).outerHeight()
                menu.css({top: pos.top + height, left: pos.left})
                menu.show()
                return false    // why return false is required? As far as I know <button> has no default behavoir.
            }

            function hide() {
                menu.hide()
            }

            /****************************** The Button ******************************/

            function build_button() {
                // Note: type="button" is required. Otherwise the button acts as submit button (if contained in a form)
                button = $("<button>").attr({type: "button"}).addClass("ui-state-default").click(show)
                var icon_span = $("<span>").addClass("ui-icon").addClass("ui-icon-triangle-1-s")
                icon_span.css({float: "right", "margin-left": "5px"})
                button.append(icon_span)
                button.append("<span></span>")  // the 2nd span holds the menu title
                add_hover_effect(button)
                // set button label
                if (menu_title) {
                    set_button_label(menu_title)
                }
            }

            function replace_button_placeholder() {
                $("#" + menu_id).replaceWith(button)
            }

            function set_button_label(label) {
                $("span:eq(1)", button).text(label)
            }
        }
    }

    /**
     * @param   item    object with "id" and "label" elements.
     */
    this.add_menu_item = function(menu_id, item) {
        menus[menu_id].add_item(item)
    }

    this.add_menu_separator = function(menu_id) {
        menus[menu_id].add_separator()
    }

    this.empty_menu = function(menu_id) {
        menus[menu_id].empty()
    }

    this.menu_val = function(menu_id) {
        return menus[menu_id].get_selection()
    }



    /*****************/
    /*** Utilities ***/
    /*****************/



    function add_hover_effect(button) {
        button.hover(
            function(){ 
                button.addClass("ui-state-hover"); 
            },
            function(){ 
                button.removeClass("ui-state-hover"); 
            }
        )
    }
}
