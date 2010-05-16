package de.deepamehta.service.rest.resources;

import de.deepamehta.service.EmbeddedService;
import de.deepamehta.service.Topic;

import org.codehaus.jettison.json.JSONArray;
import org.codehaus.jettison.json.JSONException;
import org.codehaus.jettison.json.JSONObject;

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

import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;



@Path("/topic")
// @Consumes("application/json")
// @Produces("application/json")
public class TopicResource {

    @GET
    @Path("/{id}")
    public JSONObject getTopic(@PathParam("id") long id) throws JSONException {
        return EmbeddedService.SERVICE.getTopic(id).toJSON();
    }

    @GET
    @Path("/{id}/relationships")
    public JSONArray getRelatedTopics(@PathParam("id") long id, @QueryParam("exclude") List excludeRelTypes)
                                                                                        throws JSONException {
        System.out.println("### getRelatedTopics(): id=" + id + " exclude=" + excludeRelTypes.toString() +
            " (" + excludeRelTypes.size() + " items)");
        return listToJson(EmbeddedService.SERVICE.getRelatedTopics(id, excludeRelTypes));
    }

    @POST
    public JSONObject createTopic(JSONObject topic) {
        try {
            String type = topic.getString("type_id");
            Map properties = jsonToMap(topic.getJSONObject("properties"));
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
        EmbeddedService.SERVICE.setTopicProperties(id, jsonToMap(properties));
    }

    // *** Private Helpers ***

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

    private Map<String, String> jsonToMap(JSONObject o) {
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

    private JSONArray listToJson(List<Topic> topics) throws JSONException {
        JSONArray array = new JSONArray();
        for (Topic topic : topics) {
            array.put(topic.toJSON());
        }
        return array;
    }
}
