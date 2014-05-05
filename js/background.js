chrome.runtime.onInstalled.addListener(function(details) {
    if (details.reason === "install") {
        chrome.storage.local.set({'user_id' : pisces.uuid.generate()});
    }
});

chrome.app.runtime.onLaunched.addListener(function() {
    chrome.storage.local.get("user_id", function(userId) {
        pisces.agent.config.userId = userId["user_id"];

        chrome.app.window.create('html/timeline.html',
            {
                'bounds': {
                    'width': 400,
                    'height': 500
                }
            },
            function(window) {
                pisces.agent.start();
                window.onClosed.addListener(function() {
                    pisces.agent.stop();
                });
            });
    });
});

