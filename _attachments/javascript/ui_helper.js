function UIHelper() {



    /***************/
    /*** Buttons ***/
    /***************/



    /**
     * @param   id      ID of the <button> element that is transformed to a jQuery UI button. If no such DOM element exists
     *                  in the document, a button element is created and the caller is responsible for adding the returned
     *                  button to the DOM tree.
     *
     * @return          The button (a jQuery object).
     */
    this.button = function(id, handler, label, icon, is_submit) {
        var button = $("#" + id)
        if (button.length == 0) {
            button = $("<button>").attr("id", id)
        }
        button.addClass("ui-state-default").addClass("ui-corner-all")
        // Note: type="button" is required. Otherwise the button acts as submit button (if contained in a form)
        // Note: pseudo-attribute "submit" TODO: explain
        button.attr({type: "button", submit: is_submit})
        if (icon) {
            var icon_span = $("<span>").addClass("ui-icon").addClass("ui-icon-" + icon)
            icon_span.css({"float": "left", "margin-right": "5px"})
            button.append(icon_span)
        }
        button.append(label)
        button.click(handler)
        add_hover_effect(button)
        return button
    }




    /*************/
    /*** Menus ***/
    /*************/



    var menus = {}          // key: menu ID, value: a Menu object

    /**
     * Creates a menu.
     *
     * @param   menu_id     The Menu ID. Used to identify the menu for subsequent calls, e.g. for adding items to it.
     *                      If a DOM element with such an ID exists it is replaced by the menu.
     *                      If no such DOM element exists, the caller is responsible for adding the menu to the DOM tree.
     * @param   handler     Optional: The callback function. 2 arguments are passed to it:
     *                      1) The selected menu item (an object with "value" and "label" elements).
     *                      2) The menu ID.
     *                      If not specified your application can not react on the menu selection, which is
     *                      reasonable in case of stateful select-like menus.
     * @param   items       Optional: The menu items (an array of objects with "value" and "label" elements).
     *                      If not specified the DOM element specified by menu_id is expected to be a <select> element.
     *                      Its <option> elements are taken as menu items.
     * @param   menu_title  Optional: The menu title (string).
     *                      If specified a stateless action-trigger menu with a static menu title is created.
     *                      If not specified a stateful select-like menu is created with the selected item as "menu title".
     *
     * @return              The created menu (a Menu object). The caller can add the menu to the page by accessing the menu's
     *                      "dom" attribute (a jQuery object).
     */
    this.menu = function(menu_id, handler, items, menu_title) {

        menus[menu_id] = new Menu()
        return menus[menu_id]

        function Menu() {

            var stateful = !menu_title
            var menu        // jQuery <div> object
            var button      // the menu-triggering button (jQuery <button> object)
            var selection   // selected item (object with "value" and "label" elements). Used only for stateful select-like menus.
            var dom

            // Note: the button must be build _before_ the menu is build
            // because adding menu items might affect the button label (in case of a stateful select-like menu).
            build_button()
            build_menu()
            // Note: the button must be added to the page _after_ the menu ís build
            // because the menu might rely on the placeholder element (in case the menu is build from a <select> element).
            add_to_page()

            /****************************** "Public" API ******************************/

            /**
             * @param   item    The menu item to add. An object with this elements:
             *                      "label" - The label to be displayed in the menu.
             *                      "value" - Optional: the value to be examined by the caller.
             *                          Note: if this item is about to be selected programatically the value must be specified.
             *                      "icon" - Optional: the icon to decorate the item (relative or absolute URL).
             *                      "is_trigger" (boolean) - Optional: if true this item acts as stateless
             *                          action-trigger within an stateful select-like menu. Default is false.
             *                          Reasonable only for stateful select-like menus.
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

            this.select = function(item_value) {
                select_item(find_item(item_value))
            }

            this.get_selection = function() {
                return selection
            }

            this.hide = function() {
                hide()
            }

            this.dom = dom

            /****************************** The Menu ******************************/

            function build_menu() {
                menu = $("<div>").addClass("contextmenu").css({position: "absolute"})
                if (items) {
                    $.each(items, function(i, item) {
                        add_item(item)
                    })
                } else {
                    //
                    items = []
                    //
                    $("#" + menu_id + " option").each(function() {
                        // Note: "this" references the <option> DOM element.
                        add_item({label: $(this).text(), value: this.value})
                    })
                }
                hide()
            }

            /**
             * @param   item    object with "value" (optional) and "label" elements.
             */
            function add_item(item) {
                // 1) update model
                items.push(item)
                // 2) update GUI
                var item_id = items.length - 1
                var anchor = $("<a>").attr({href: "", id: anchor_id(item_id)}).click(item_selected)
                if (item.icon) {
                    anchor.append(image_tag(item.icon, "menu-icon"))
                }
                anchor.append(item.label)
                menu.append(anchor)
                // select the item if there is no selection yet
                if (!selection) {
                    // Note: this sets also the button label (in case of stateful select-like menus)
                    select_item(item)
                }
            }

            /**
             * ### FIXME: not used for DeepaMehta 3
             *
             * @param   index   the index of the item to select. Starts with 0. Note: separators do not count.
             *                  If no such item exists nothing is performed.
             */
            function select(index) {
                select_item(items[index])
            }

            /**
             * @param   item    object with "value" and "label" elements.
             */
            function select_item(item) {
                // Note: only select-like menus have selection state.
                if (stateful && !item.is_trigger) {
                    // update model
                    selection = item
                    // update GUI
                    set_button_label(item.label)
                }
            }

            function remove_selection() {
                selection = null
            }

            /**
             * @param   anchor      the <a> jQuery object
             * @return              the menu item (object with "value" and "label" elements)
             */
            function get_item(anchor) {
                return items[item_id(anchor.attr("id"))]
            }

            function item_selected() {
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
                var pos = button.position()
                var height = button.outerHeight()
                menu.css({top: pos.top + height, left: pos.left})
                menu.show()
            }

            function hide() {
                menu.hide()
            }

            /****************************** The Button ******************************/

            function build_button() {
                // Note: type="button" is required. Otherwise the button acts as submit button (if contained in a form)
                button = $("<button>").attr({type: "button"}).addClass("ui-state-default").click(button_clicked)
                var icon_span = $("<span>").addClass("ui-icon").addClass("ui-icon-triangle-1-s")
                icon_span.css({"float": "right", "margin-left": "5px"})
                button.append(icon_span)
                button.append("<span></span>")  // the 2nd span holds the menu title
                add_hover_effect(button)
                // set button label
                if (menu_title) {
                    set_button_label(menu_title)
                }
            }

            function set_button_label(label) {
                $("span:eq(1)", button).text(label)
            }

            function button_clicked() {
                if (menu.css("display") == "none") {
                    hide_all_menus()
                    show()
                } else {
                    hide()
                }
            }

            /****************************** The Compound ******************************/

            function add_to_page() {
                dom = $("<span>").append(button).append(menu)
                $("#" + menu_id).replaceWith(dom)
            }

            /****************************** Helper ******************************/

            function find_item(value) {
                for (var i = 0, item; item = items[i]; i++) {
                    if (item.value == value) {
                        return item
                    }
                }
                alert("find_item: item with value \"" + value + "\" not found in menu \"" + menu_id + "\"")
            }

            function anchor_id(item_id) {
                return menu_id + "_item_" + item_id
            }

            function item_id(anchor_id) {
                return anchor_id.substring((menu_id + "_item_").length)
            }
        }

        function hide_all_menus() {
            for (var menu_id in menus) {
                menus[menu_id].hide()
            }
        }
    }

    /**
     * @param   item    object with "value" and "label" elements.
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

    this.select_menu_item = function(menu_id, item_value) {
        menus[menu_id].select(item_value)
    }

    this.menu_item = function(menu_id) {
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
