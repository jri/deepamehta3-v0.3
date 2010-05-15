package de.deepamehta.service.rest.resources;

import de.deepamehta.service.EmbeddedService;
import de.deepamehta.service.Topic;

import org.codehaus.jettison.json.JSONObject;
import org.codehaus.jettison.json.JSONException;

import javax.ws.rs.GET;
import javax.ws.rs.PUT;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.Consumes;
import javax.ws.rs.PathParam;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.Application;
import javax.ws.rs.core.Context;
import javax.ws.rs.core.UriInfo;

import java.util.Map;
import java.util.HashMap;
import java.util.Iterator;



@Path("/topic")
// @Consumes("application/json")
// @Produces("application/json")
public class TopicResource {

    @POST
    public JSONObject createTopic(JSONObject topic) {
        try {
            String type = topic.getString("type_id");
            Map properties = asMap(topic.getJSONObject("properties"));
            Topic t = EmbeddedService.SERVICE.createTopic(type, properties);
            JSONObject response = new JSONObject();
            response.put("topic_id", t.id);
            return response;
        } catch (JSONException je) {
            je.printStackTrace();
            return null;
        }
    }

    @PUT
    @Path("/{id}")
    public void setTopicProperties(@PathParam("id") long id, JSONObject properties) {
        System.out.println("### TopicResource.setTopicProperties invoked");
        EmbeddedService.SERVICE.setTopicProperties(id, asMap(properties));
    }

    // Helper

    /* Map getMap(JSONObject o, String key) {
        try {
            if (o.has(key)) {
                return asMap(o.getJSONObject(key));
            } else {
                return null;
            }
        } catch (JSONException je) {
            je.printStackTrace();
            return null;
        }
    } */

    Map<String, String> asMap(JSONObject o) {
        try {
            Map<String, String> map = new HashMap<String, String>();
            Iterator i = o.keys();
            while (i.hasNext()) {
                String key = (String) i.next();
                map.put(key, o.getString(key));
            }
            return map;
        } catch (JSONException je) {
            je.printStackTrace();
            return null;
        }
    }
}
