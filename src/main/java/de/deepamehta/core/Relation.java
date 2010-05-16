package de.deepamehta.core;

import org.codehaus.jettison.json.JSONObject;
import org.codehaus.jettison.json.JSONException;

import java.util.Map;



public class Relation {

    public long id;
    public String typeId;
    public long srcTopicId;
    public long dstTopicId;
    public Map<String, Object> properties;

    public Relation(long id, String typeId, long srcTopicId, long dstTopicId, Map properties) {
        this.id = id;
        this.typeId = typeId;
        this.srcTopicId = srcTopicId;
        this.dstTopicId = dstTopicId;
        this.properties = properties;
    }

    public JSONObject toJSON() throws JSONException {
        JSONObject o = new JSONObject();
        o.put("id", this.id);
        o.put("type_id", this.typeId);
        o.put("src_topic_id", this.srcTopicId);
        o.put("dst_topic_id", this.dstTopicId);
        o.put("properties", this.properties);
        return o;
    }
}
