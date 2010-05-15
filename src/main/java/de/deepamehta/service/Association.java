package de.deepamehta.service;

import java.util.Map;



public class Association {

    public long id;
    public String type_name;
    public Map<String, String> properties;

    public Association(long id, String type_name, Map properties) {
        this.id = id;
        this.type_name = type_name;
        this.properties = properties;
    }
}
