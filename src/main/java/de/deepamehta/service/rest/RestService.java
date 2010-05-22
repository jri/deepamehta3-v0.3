package de.deepamehta.service.rest;

import de.deepamehta.service.rest.resources.TopicResource;
import de.deepamehta.service.rest.resources.RelationResource;

import javax.ws.rs.core.Application;

import java.util.HashSet;
import java.util.Set;
import java.util.logging.Logger;



public class RestService extends Application {

    private Logger logger = Logger.getLogger(getClass().getName());

    @Override
    public Set getClasses() {
        Set s = new HashSet();
        s.add(TopicResource.class);
        s.add(RelationResource.class);
        return s;
    }    
}
