
addPiscesExtension(this);

chrome.runtime.onInstalled.addListener(function(details) {
    if (details.reason === "install") {
        chrome.storage.local.set({
            "user_id" : pisces.uuid.generate(),
            "username" : "Anonymous",
            "seqnum" : 0
        });
    }
});

chrome.app.runtime.onLaunched.addListener(function() {
    chrome.storage.local.get(["user_id", "username", "seqnum"], function(items) {

        pisces.agent.config.userId = items["user_id"];
        pisces.agent.config.username = items["username"];
        pisces.agent.seqnum = items["seqnum"];

        pisces.agent.start(function() {
            console.log("pisces agent started. seqnum=" + pisces.agent.seqnum);

            chrome.app.window.create('html/timeline.html',
                {
                    'bounds': {
                        'width': 400,
                        'height': 500
                    }
                },
                function(window) {
                    addPiscesExtension(window.contentWindow);
                    window.contentWindow.pisces = pisces;

                    window.onClosed.addListener(function() {
                        pisces.agent.sendBye(function(result) {
                            pisces.agent.stop(function() {
                                chrome.storage.local.set({"seqnum" : pisces.agent.seqnum});
                                console.log("pisces agent stopped.");
                            });
                        });
                    });
                });
        });
    });
});

chrome.storage.onChanged.addListener(function(changes, namespace) {
    if (namespace === "local") {
        if (changes["username"]) {
            pisces.agent.config.username = changes["username"].newValue;
            pisces.agent.sendHello();
        }
    }
});

