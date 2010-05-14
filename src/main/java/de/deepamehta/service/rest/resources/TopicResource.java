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
            System.out.println("### TopicResource.createTopic invoked");
            String type = topic.getString("type");
            Map properties = asMap(topic.getJSONObject("properties"));
            return EmbeddedService.SERVICE.createTopic(type, properties).toJSON();
        } catch (JSONException je) {
            System.out.println("### ERROR while parsing JSON: " + je);
            return null;
        }
    }

    @PUT
    @Path("/topic/{id}")
    public void setTopicProperties(@PathParam("id") long id, Map properties) {
        System.out.println("### TopicResource.setTopicProperties invoked");
        EmbeddedService.SERVICE.setTopicProperties(id, properties);
    }

    // Helper

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
            System.out.println("### ERROR: " + je);
            return null;
        }
    }
}
