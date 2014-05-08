
addPiscesExtension(this);

chrome.runtime.onInstalled.addListener(function(details) {
    if (details.reason === "install") {
        chrome.storage.local.set({'user_id' : pisces.uuid.generate()});
    }
});

chrome.app.runtime.onLaunched.addListener(function() {
    chrome.storage.local.get("user_id", function(userId) {
        pisces.agent.config.userId = userId["user_id"];

        pisces.agent.start(function() {
            console.log("pisces agent started.");

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
                                console.log("pisces agent stopped.");
                            });
                        });
                    });
                });
        });
    });
});

