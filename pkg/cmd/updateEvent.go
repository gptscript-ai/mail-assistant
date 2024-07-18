package cmd

import (
	"encoding/json"
	"fmt"
	"os"

	"ethan/pkg/mstoken"
	msgraphsdk "github.com/microsoftgraph/msgraph-sdk-go"
	graphmodels "github.com/microsoftgraph/msgraph-sdk-go/models"
	"github.com/spf13/cobra"
)

type UpdateEvent struct{}

type meetingOutput struct {
	URL          string `json:"url"`
	TollNumber   string `json:"tollNumber"`
	ConferenceID string `json:"conferenceID"`
}

func (u *UpdateEvent) Run(cmd *cobra.Command, _ []string) error {
	cred := mstoken.NewStaticTokenCredential(os.Getenv("GPTSCRIPT_GRAPH_MICROSOFT_COM_BEARER_TOKEN"))
	client, err := msgraphsdk.NewGraphServiceClientWithCredentials(cred, []string{})
	if err != nil {
		return err
	}

	eventID := os.Getenv("EVENT_ID")
	requestBody := graphmodels.NewEvent()
	isOnlineMeeting := true
	requestBody.SetIsOnlineMeeting(&isOnlineMeeting)
	onlineMeetingProvider := graphmodels.TEAMSFORBUSINESS_ONLINEMEETINGPROVIDERTYPE
	requestBody.SetOnlineMeetingProvider(&onlineMeetingProvider)
	if _, err := client.Me().Events().ByEventId(eventID).Patch(cmd.Context(), requestBody, nil); err != nil {
		return err
	}

	event, err := client.Me().Events().ByEventId(eventID).Get(cmd.Context(), nil)
	if err != nil {
		return err
	}
	if event.GetOnlineMeeting() != nil {
		meetingOutput := meetingOutput{
			URL:          *event.GetOnlineMeeting().GetJoinUrl(),
		}
		if event.GetOnlineMeeting().GetTollNumber() != nil {
			meetingOutput.TollNumber = *event.GetOnlineMeeting().GetTollNumber()
		}
		if event.GetOnlineMeeting().GetConferenceId() != nil {
			meetingOutput.ConferenceID = *event.GetOnlineMeeting().GetConferenceId()
		}
		data, err := json.MarshalIndent(meetingOutput, "", "  ")
		if err != nil {
			return err
		}
		fmt.Println(string(data))
	}

	return nil
}
