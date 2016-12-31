// Sets up the initial handshake with the host frame
VSS.init({
	// Our extension will explicitly notify the host when we're done loading
	explicitNotifyLoaded: true,

	// We are using some Team Services APIs, so we will need the module loader to load them in
	usePlatformScripts: true,
	usePlatformStyles: true
});
// Load Team Services controls
// Load VSTS controls and REST client
VSS.require(["VSS/Controls", "VSS/Controls/Grids", "VSS/Controls/Dialogs",
	"VSS/Service", "TFS/VersionControl/GitRestClient"],
	function (Controls, Grids, Dialogs, VSS_Service, Git_Client) {

		var gitClient = VSS_Service.getCollectionClient(Git_Client.GitHttpClient);

		var currentContext = VSS.getWebContext();
		var projCurr = currentContext.project.name;
		var currUserId = currentContext.user.id;

		$("#ProjectNameSpan").text(projCurr);

		gitClient.getPullRequestsByProject(projCurr).then(function (pullRequests) {
			$("#PullRequestCountSpan").html(pullRequests.length);
			jQuery.each(pullRequests, function (index, pullRequest) {
				var id = pullRequest.pullRequestId;
				$("#pullRequestTableBody").append("<tr class=\"noMatchUser\" id=\"" + id + "\"></tr>");
				$("#" + id + "").append("<td>" + id + "</td>");
				var creatorElem = $("<td></td>").append($("<img class=\"img-responsive\" width=\"27px\" height=\"27px\" src=\"" + pullRequest.createdBy.imageUrl + "\" title=\"" + pullRequest.createdBy.displayName + "\" alt=\"" + pullRequest.createdBy.displayName + "\"></img>"));
				$("#" + id + "").append(creatorElem);
				var repoName;
				gitClient.getRepository(pullRequest.repository.id).then(function (repo) {
					$("#" + id + "").find("[data-repid='" + pullRequest.repository.id + "']").before($("<td></td>").text(repo.name));
				});
				$("#" + id + "").append($("<td data-repid=\"" + pullRequest.repository.id + "\"></td>").text(pullRequest.title));
				var dStr = pullRequest.creationDate.toString();
				var cDate = dStr.substring(0, 24);
				$("#" + id + "").append("<td>" + cDate + "</td>");
				var testMerge = pullRequest.mergeStatus;
				var resultMerge = testMerge === 3 ? "Succeeded" : "Failed";
				var resultMerge2 = testMerge === 3 ? "success" : "danger";
				var mergeElem = $("<td>" + resultMerge + "</td>").css("color", testMerge === 3 ? "green" : "red");
				$("#" + id + "").append(mergeElem);
				$("#" + id + "").addClass(resultMerge2);
				var holder = $("<td></td>");
				jQuery.each(pullRequest.reviewers, function (index, reviewer) {
					var reviewerId = reviewer.id;
					if (currUserId === reviewerId) $("#" + id + "").removeClass("noMatchUser");
					var vote = "";
					var infoBubble = "No response.";
					if (reviewer.vote === -5) {
						vote = " waitingauthor";
						infoBubble = reviewer.displayName + " recommends waiting for the author of the code.";
					}
					if (reviewer.vote === 5) {
						vote = " approvedwithsuggestions";
						infoBubble = reviewer.displayName + " approved the pull request with suggestions.";
					}
					if (reviewer.vote === 10) {
						vote = " approved";
						infoBubble = reviewer.displayName + " approved the pull request.";
					}
					if (reviewer.vote === -10) {
						vote = " rejected";
						infoBubble = reviewer.displayName + " rejected the pull request.";
					}
					holder.append($("<img data-toggle=\"tooltip\" title=\"" + infoBubble + "\" class=\"img-responsive" + vote + "\" width=\"27px\" height=\"27px\" src=\"" + reviewer.imageUrl + "\" alt=\"" + reviewer.displayName + "\"></img>"));
				});
				$("#" + id + "").append(holder);
				var theRepo = currentContext.host.uri + projCurr + "\/_git" + "\/" + pullRequest.repository.id +"\/pullRequest\/"+id; // <- Will this fix on-prem.?
				//var thePullReq = pullRequest.url;
				//var modified = thePullReq.replace("_apis\/git\/repositories", projCurr + "\/_git");
				//var modified2 = modified.replace("pullRequests", "pullRequest");
				var pullWorkElem = $("<td></td>").append($("<a target=\"_parent\" class=\"btn btn-default\" role=\"button\" id=\"refLink\" href=\"" + theRepo + "\"><span class=\"glyphicon glyphicon-arrow-right\" aria-hidden=\"true\"></span></a>"));
				$("#" + id + "").append(pullWorkElem);
			});
		}).catch(console.log.bind(console));

		$('[data-toggle="tooltip"]').tooltip();

		VSS.notifyLoadSucceeded();
	});
$(document).ready(function () {
	$('#limitReviewerMe').change(function () {
		$('.noMatchUser').toggle(!(this.checked));
	});
});