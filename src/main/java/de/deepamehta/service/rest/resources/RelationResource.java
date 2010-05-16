package de.deepamehta.service.rest.resources;

import de.deepamehta.core.Topic;
import de.deepamehta.core.Relation;
import de.deepamehta.core.JSONHelper;
import de.deepamehta.service.EmbeddedService;

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



@Path("/relation")
// @Consumes("application/json")
// @Produces("application/json")
public class RelationResource {

    @POST
    public JSONObject createRelation(JSONObject relation) throws JSONException{
        //
        String typeId = relation.getString("type_id");
        long srcTopicId = relation.getLong("src_topic_id");
        long dstTopicId = relation.getLong("dst_topic_id");
        Map properties = JSONHelper.toMap(relation.getJSONObject("properties"));
        //
        Relation rel = EmbeddedService.SERVICE.createRelation(typeId, srcTopicId, dstTopicId, properties);
        //
        JSONObject response = new JSONObject();
        response.put("relation_id", rel.id);
        return response;
    }
}
