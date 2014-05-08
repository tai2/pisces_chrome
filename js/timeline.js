document.addEventListener('DOMContentLoaded', function() {
    chrome.runtime.getBackgroundPage(function(window) {

        pisces.agent.sendHello();

        $("#user_id").text(pisces.agent.config.userId);
        $("#username").text(pisces.agent.config.username);

        $("#send_button").click(function() {
            pisces.agent.sendMessage($("#message").val());
        });

        pisces.agent.listeners.onHello = function(info) {
            $("#participants tbody").append("<tr><td>" + info.id + "</td><td>" + info.username + "</td></tr>");
        };
        pisces.agent.listeners.onBye = function(info) {
            $("#leave_message").text(info.username + " has leaved.");
        }
        pisces.agent.listeners.onMessage = function(message) {
            $("#received").text(message);
        };
    });
});

