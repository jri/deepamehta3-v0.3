package de.deepamehta.service;

import org.codehaus.jettison.json.JSONObject;
import org.codehaus.jettison.json.JSONException;

import java.util.Map;



public class Topic {

    public long id;
    public String typeId;                   // FIXME: might be uninitialized.
    public Map<String, String> properties;  // FIXME: might be uninitialized.

    public Topic(long id, String typeId, Map properties) {
        this.id = id;
        this.typeId = typeId;
        this.properties = properties;
    }

    public JSONObject toJSON() throws JSONException {
        JSONObject properties = new JSONObject();
        if (this.properties != null) {
            for (String key : this.properties.keySet()) {
                properties.put(key, this.properties.get(key));
            }
        }
        JSONObject o = new JSONObject();
        o.put("id", this.id);
        o.put("type_id", this.typeId);
        o.put("properties", properties);
        return o;
    }
}
