document.addEventListener('DOMContentLoaded', function() {
    chrome.runtime.getBackgroundPage(function(window) {

        pisces.agent.sendHello();

        $("#user_id").text(pisces.agent.config.userId);

        $("#send_button").click(function() {
            pisces.agent.sendMessage($("#message").val());
        });

        pisces.agent.listeners.onHello = function(sender_id, iconHash, userName) {
        };
        pisces.agent.listeners.onMessage = function(message) {
            $("#received").text(message);
        };
    });
});

