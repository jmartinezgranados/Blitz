// The viewmodel
var pullRequestArray = [];

var updateByRepository = function (option, checked) {
	var reposToShow = $("#repositories-select").val();
	if (reposToShow && reposToShow.length > 0) {
		$('#pullRequestTableBody td:nth-child(3)').each(function (i, el) {
			if (!reposToShow.includes($(el).text())) {
				$(el).closest("tr").addClass("hidden");
			} else {
				$(el).closest("tr").removeClass("hidden");
			}
		});
	} else {
		$('#pullRequestTableBody td:nth-child(3)').each(function (i, el) {
			$(el).closest("tr").addClass("hidden");
		});
	}
	$("#PullRequestCountSpan").html($("#pullRequestTableBody tr").not(".hidden").length);
	setSelectedRepositories(reposToShow);
};

// Sets up the initial handshake with the host frame
VSS.init({
	// Our extension will explicitly notify the host when we're done loading
	explicitNotifyLoaded: true,

	// We are using some Team Services APIs, so we will need the module loader to load them in
	usePlatformScripts: true,
	usePlatformStyles: true
});

// Load VSTS context and data.
VSS.require(["VSS/Controls", "VSS/Controls/Grids", "VSS/Controls/Dialogs",
		"VSS/Service", "TFS/VersionControl/GitRestClient", "TFS/Build/RestClient"
	],
	function (Controls, Grids, Dialogs, VSS_Service, Git_Client, Build_Client) {
		// The Git and Buile clients for eventually populating code and build details.
		var gitClient = VSS_Service.getCollectionClient(Git_Client.GitHttpClient);
		var buildClient = Build_Client.getClient();

		// Get Context from VSTS
		var currentContext = VSS.getWebContext();
		var projCurr = currentContext.project.name;
		var currUserId = currentContext.user.id;

		// Display Project Name
		$("#ProjectNameSpan").text(projCurr);

		// Get all repositories and add them to the multiselect
		var repositories = [];
		gitClient.getRepositories(projCurr).then(function (fetchedRepos) {
			repositories = fetchedRepos;
			// Sort the repositories alphabetically
			repositories.sort((a, b) => (a.name > b.name) ? 1 : ((b.name > a.name) ? -1 : 0));
		}).finally(function () {
			initializeMultiselect(repositories);
		}).catch(console.log.bind(console));

		// Get Pull Reuqets Data and populate pull request array.
		gitClient.getPullRequestsByProject(projCurr).then(function (pullRequests) {
			jQuery.each(pullRequests, function (index, pullRequest) {
				var idData = pullRequest.pullRequestId;
				var createdByData = pullRequest.createdBy;
				var pullRequestLinkData = currentContext.host.uri + encodeURIComponent(projCurr) + "\/_git" + "\/" + pullRequest.repository.id + "\/pullRequest\/" + pullRequest.pullRequestId;
				var cDateData = pullRequest.creationDate.toString();
				var titleData = pullRequest.title;
				var resultMergeData = pullRequest.mergeStatus === 3 ? "Succeeded" : "Conflicts";
				var resultMerge2Data = pullRequest.mergeStatus === 3 ? "success" : "danger";
				var repositoryData = pullRequest.repository;

				// Create pull Request Object
				var pullRequestData = {
					id: idData,
					createdBy: createdByData,
					pullRequestLink: pullRequestLinkData,
					title: titleData,
					cDate: cDateData,
					resultMerge: resultMergeData,
					resultMerge2: resultMerge2Data,
					userId: currUserId,
					repository: repositoryData
				};

				// Get and populate reviewers.
				var reviewerArray = [];
				jQuery.each(pullRequest.reviewers, function (index, reviewer) {
					reviewerArray.push(reviewer);
				});
				pullRequestData.reviewers = reviewerArray;

				// Push pullRequest to array.
				pullRequestArray.push(pullRequestData);
			});
		}).finally(function () {
			generatePullRequestTable(pullRequestArray);
		}).catch(console.log.bind(console));

		VSS.notifyLoadSucceeded();
	});

function setSelectedRepositories(arrayOfRepositories) {
	// Get data service
	VSS.getService(VSS.ServiceIds.ExtensionData).then(function (dataService) {
		// Set value in user scope
		dataService.setValue("selectedRepositories", arrayOfRepositories, {
			scopeType: "User"
		});
	});
}

function initializeMultiselect(repositories) {
	// Get data service
	VSS.getService(VSS.ServiceIds.ExtensionData).then(function (dataService) {
		dataService.getValue("selectedRepositories", {
			scopeType: "User"
		}).then(function (selectedRepositories) {
			// Append the multiselect
			$.each(repositories, function (i, repository) {
				var selectedString = "";
				var repositoryName = repository.name;

				// Pre-select the options
				if (!selectedRepositories || selectedRepositories.includes(repositoryName)) {
					selectedString = "selected='selected'";
				}
				$("#repositories-select").append("<option value='" + repositoryName + "' " + selectedString + ">" + repositoryName + "</option>");
			});

			// Initialize multiselect
			$("#repositories-select").multiselect({
				maxHeight: 200,
				includeSelectAllOption: true,
				nonSelectedText: 'Select repositories',
				onDeselectAll: updateByRepository,
				onSelectAll: updateByRepository,
				onChange: updateByRepository,
			});
		});
	});
}

function generatePullRequestTable(pullRequestArray) {
	VSS.getService(VSS.ServiceIds.ExtensionData).then(function (dataService) {
		dataService.getValue("selectedRepositories", {
			scopeType: "User"
		}).then(function (selectedRepositories) {
			jQuery.each(pullRequestArray, function (index, pullRequest) {

				var hiddenClass = (selectedRepositories && !selectedRepositories.includes(pullRequest.repository.name)) ? "hidden" : "";
				$("#pullRequestTableBody").append("<tr class=\"notUserReviewer notUserCreator " + hiddenClass + " \" id=\"" + pullRequest.id + "\"></tr>");

				if (pullRequest.userId === pullRequest.createdBy.id) $("#" + pullRequest.id + "").removeClass("notUserCreator");

				$("#" + pullRequest.id + "").append("<td style=\"color:black !important;\"><a href=" + pullRequest.pullRequestLink + " target=_parent>" + pullRequest.id + "</a></td>");

				var creatorElem = $("<td></td>").append($("<img class=\"img-responsive\" width=\"27px\" height=\"27px\" src=\"" + pullRequest.createdBy.imageUrl + "\" title=\"" + pullRequest.createdBy.displayName + "\" alt=\"" + pullRequest.createdBy.displayName + "\"></img>"));
				$("#" + pullRequest.id + "").append(creatorElem);

				$("#" + pullRequest.id + "").append($("<td data-repid=\"" + pullRequest.repository.id + "\"></td>").text(pullRequest.title));
				$("#" + pullRequest.id + "").find("[data-repid='" + pullRequest.repository.id + "']").before($("<td></td>").text(pullRequest.repository.name));
				$("#" + pullRequest.id + "").append("<td>" + pullRequest.cDate + "</td>");

				var mergeElem = $("<td>" + pullRequest.resultMerge + "</td>").css("color", pullRequest.resultMerge === "Succeeded" ? "green" : "red");
				$("#" + pullRequest.id + "").append(mergeElem);

				var holder = $("<td></td>");
				// Add Reviewers
				jQuery.each(pullRequest.reviewers, function (index, reviewer) {
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
					if (pullRequest.userId === reviewer.id) $("#" + pullRequest.id + "").removeClass("notUserReviewer");

					holder.append($("<img data-toggle=\"tooltip\" title=\"" + infoBubble + "\" class=\"img-responsive" + vote + "\" width=\"27px\" height=\"27px\" src=\"" + reviewer.imageUrl + "\" alt=\"" + reviewer.displayName + "\"></img>"));
				});
				$("#" + pullRequest.id + "").append(holder);


				$("#" + pullRequest.id + "").addClass(pullRequest.resultMerge2);

				$("#" + pullRequest.id + "").data("linkToPr", pullRequest.pullRequestLink);

				$('[data-toggle="tooltip"]').tooltip();
			});

			// Set count
			$("#PullRequestCountSpan").html($("#pullRequestTableBody tr").not(".hidden").length);
		});
	});
};

$(document).ready(function () {
	$('#limitReviewerMe').change(function () {
		$('.notUserReviewer').toggle(!(this.checked));
		if ($('#limitCreatorMe').is(':checked')) $('.notUserCreator').toggle(false);
	});
	$('#limitCreatorMe').change(function () {
		$('.notUserCreator').toggle(!(this.checked));
		if ($('#limitReviewerMe').is(':checked')) $('.notUserReviewer').toggle(false);
	});
	$(document).on("click", "#pullRequestTableBody tr", function () {
		window.open($(this).data("linkToPr"), "_parent");
	});
	$("#toggleOptions").click(function () {
		$("#filters").toggle();
	});
	$("#selTheme").change(function () {
		var selectedValue = $("#selTheme").val();
		if (selectedValue === "Classic") {
			var succeeded = $("tr.successful");
			succeeded.removeClass("successful");
			succeeded.addClass("success");
			var unsucceessful = $("tr.unsuccessful");
			unsucceessful.removeClass("unsuccessful");
			unsucceessful.addClass("danger");
		} else if (selectedValue == "Small Fade") {
			var succeeded = $("tr.success");
			succeeded.removeClass("success");
			succeeded.addClass("successful");
			var unsucceessful = $("tr.danger");
			unsucceessful.removeClass("danger");
			unsucceessful.addClass("unsuccessful");
		}
	});
});
