package de.deepamehta.core;

import org.codehaus.jettison.json.JSONObject;
import org.codehaus.jettison.json.JSONException;

import java.util.Map;



public class Topic {

    public long id;
    public String typeId;                   // FIXME: might be uninitialized.
    public Map<String, Object> properties;  // FIXME: might be uninitialized.

    public Topic(long id, String typeId, Map properties) {
        this.id = id;
        this.typeId = typeId;
        this.properties = properties;
    }

    public JSONObject toJSON() throws JSONException {
        JSONObject o = new JSONObject();
        o.put("id", this.id);
        o.put("type_id", this.typeId);
        o.put("properties", JSONHelper.fromMap(this.properties));
        return o;
    }
}
