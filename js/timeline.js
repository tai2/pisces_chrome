document.addEventListener('DOMContentLoaded', function() {
    chrome.runtime.getBackgroundPage(function(window) {
        var pisces = window.pisces;

        $("#send_button").click(function() {
            pisces.sendMessage($("#message").val());
        });

        pisces.listeners.onMessage = function(message) {
            $("#received").text(message);
        }
    });
});

