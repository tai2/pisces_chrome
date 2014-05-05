var pisces = createAgent('224.0.0.1', 30000);

chrome.app.runtime.onLaunched.addListener(function() {

    chrome.app.window.create('html/timeline.html',
        {
            'bounds': {
                'width': 400,
                'height': 500
            }
        },
        function(window) {
            pisces.start();

            window.onClosed.addListener(function() {
                pisces.stop();
            });
        });
});

