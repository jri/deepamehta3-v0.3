package de.deepamehta.service;

import org.codehaus.jettison.json.JSONObject;
import org.codehaus.jettison.json.JSONException;

import java.util.Map;



public class Topic {

    long id;
    String type;
    Map<String, String> properties;

    public Topic(long id, String type, Map properties) {
        this.id = id;
        this.type = type;
        this.properties = properties;
    }

    public JSONObject toJSON() {
        try {
            JSONObject properties = new JSONObject();
            for (String key : this.properties.keySet()) {
                properties.put(key, this.properties.get(key));
            }
            JSONObject o = new JSONObject();
            o.put("id", this.id);
            o.put("type", this.type);
            o.put("properties", properties);
            return o;
        } catch (JSONException je) {
            System.out.println("### ERROR: " + je);
            return null;
        }
    }
}
