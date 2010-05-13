package de.deepamehta.service.resources;

import de.deepamehta.service.DeepaMehtaService;

import org.neo4j.graphdb.Node;

import org.codehaus.jettison.json.JSONObject;
import org.codehaus.jettison.json.JSONException;

import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.PathParam;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.Application;
import javax.ws.rs.core.Context;
import javax.ws.rs.core.UriInfo;

import java.util.Map;
import java.util.HashMap;



@Path("/topic")
public class TopicResource {

	@POST
	@Produces("application/json")
	public JSONObject createTopic() {
		Node node = DeepaMehtaService.DMS.createNode();
		return json(node);
	}

	JSONObject json(Node node) {
		try {
			JSONObject o = new JSONObject();
			JSONObject properties = new JSONObject();
			for (String key : node.getPropertyKeys()) {
				properties.put(key, node.getProperty(key));
			}
			o.put("id", node.getId());
			o.put("properties", properties);
			return o;
		} catch (JSONException je) {
			return null;
		}
	}
}
