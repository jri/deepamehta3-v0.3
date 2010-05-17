package de.deepamehta.core;

import org.codehaus.jettison.json.JSONArray;
import org.codehaus.jettison.json.JSONException;
import org.codehaus.jettison.json.JSONObject;

import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;



public class JSONHelper {

    public static Map toMap(JSONObject o) throws JSONException {
        Map map = new HashMap();
        Iterator<String> i = o.keys();
        while (i.hasNext()) {
            String key = i.next();
            map.put(key, o.get(key));
        }
        return map;
    }
}