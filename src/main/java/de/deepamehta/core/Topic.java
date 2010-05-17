package de.deepamehta.core;

import org.codehaus.jettison.json.JSONObject;
import org.codehaus.jettison.json.JSONException;

import java.util.Map;



public class Topic {

    public long id;
    public String typeId;                   // FIXME: might be uninitialized.
    public String label;
    public Map<String, Object> properties;  // FIXME: might be uninitialized.

    public Topic(long id, String typeId, String label, Map properties) {
        this.id = id;
        this.typeId = typeId;
        this.label = label;
        this.properties = properties;
    }

    public JSONObject toJSON() throws JSONException {
        JSONObject o = new JSONObject();
        o.put("id", id);
        o.put("type_id", typeId);
        o.put("label", label);
        o.put("properties", properties);
        return o;
    }
}
