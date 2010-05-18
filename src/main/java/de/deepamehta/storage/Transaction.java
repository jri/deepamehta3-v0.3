package de.deepamehta.storage;



public interface Transaction {

    void success();

    void failure();

    void finish();
}
