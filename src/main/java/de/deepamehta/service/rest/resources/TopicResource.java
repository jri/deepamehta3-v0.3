package de.deepamehta.service.rest.resources;

import de.deepamehta.core.Topic;
import de.deepamehta.core.JSONHelper;
import de.deepamehta.service.EmbeddedService;

import org.codehaus.jettison.json.JSONArray;
import org.codehaus.jettison.json.JSONException;
import org.codehaus.jettison.json.JSONObject;

import javax.ws.rs.GET;
import javax.ws.rs.PUT;
import javax.ws.rs.POST;
import javax.ws.rs.DELETE;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.Consumes;
import javax.ws.rs.PathParam;
import javax.ws.rs.QueryParam;

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
    @Path("/{id}/related_topics")
    public JSONArray getRelatedTopics(@PathParam("id") long id, @QueryParam("exclude") List excludeRelTypes)
                                                                                        throws JSONException {
        System.out.println("  # TopicResource.getRelatedTopics(): id=" + id + " exclude=" + excludeRelTypes.toString() +
            " (" + excludeRelTypes.size() + " items)");
        return listToJson(EmbeddedService.SERVICE.getRelatedTopics(id, excludeRelTypes));
    }

    @POST
    public JSONObject createTopic(JSONObject topic) throws JSONException {
        String type = topic.getString("type_id");
        Map properties = JSONHelper.toMap(topic.getJSONObject("properties"));
        Topic t = EmbeddedService.SERVICE.createTopic(type, properties);
        JSONObject response = new JSONObject();
        response.put("topic_id", t.id);
        return response;
    }

    @PUT
    @Path("/{id}")
    public void setTopicProperties(@PathParam("id") long id, JSONObject properties) throws JSONException {
        EmbeddedService.SERVICE.setTopicProperties(id, JSONHelper.toMap(properties));
    }

    @DELETE
    @Path("/{id}")
    public JSONObject deleteTopic(@PathParam("id") long id) throws JSONException {
        List deletedRelIds = EmbeddedService.SERVICE.deleteTopic(id);
        JSONObject response = new JSONObject();
        response.put("deleted_relations", deletedRelIds);
        return response;
    }

    // *** Private Helpers ***

    private JSONArray listToJson(List<Topic> topics) throws JSONException {
        JSONArray array = new JSONArray();
        for (Topic topic : topics) {
            array.put(topic.toJSON());
        }
        return array;
    }
}
