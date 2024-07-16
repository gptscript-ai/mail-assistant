package cmd

import (
	"fmt"
	"os"

	"ethan/pkg/mstoken"
	msgraphsdk "github.com/microsoftgraph/msgraph-sdk-go"
	graphmodels "github.com/microsoftgraph/msgraph-sdk-go/models"
	"github.com/spf13/cobra"
)

type UpdateEvent struct{}

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
	event, err := client.Me().Events().ByEventId(eventID).Patch(cmd.Context(), requestBody, nil)
	if err != nil {
		return err
	}
	fmt.Printf("Meeting location url: %v\n", *event.GetOnlineMeetingUrl())
	return nil
}
