package cmd

import (
	"context"
	"fmt"
	"os"
	"strings"
	"time"

	"ethan/pkg/mstoken"
	abstractions "github.com/microsoft/kiota-abstractions-go"
	msgraphsdk "github.com/microsoftgraph/msgraph-sdk-go"
	graphmodels "github.com/microsoftgraph/msgraph-sdk-go/models"
	graphusers "github.com/microsoftgraph/msgraph-sdk-go/users"
	"github.com/spf13/cobra"
)

type CheckSchedule struct {
}

func (c *CheckSchedule) Run(cmd *cobra.Command, _ []string) error {
	cred := mstoken.NewStaticTokenCredential(os.Getenv("GPTSCRIPT_GRAPH_MICROSOFT_COM_BEARER_TOKEN"))
	client, err := msgraphsdk.NewGraphServiceClientWithCredentials(cred, []string{})
	if err != nil {
		return err
	}

	headers := abstractions.NewRequestHeaders()
	headers.Add("Prefer", "outlook.body-content-type=text")
	emailRecipients := strings.Split(os.Getenv("EMAIL_RECIPIENT"), ",")

	ret := strings.Builder{}
	for _, recipient := range emailRecipients {
		rep := strings.TrimSpace(recipient)
		requestParameters := &graphusers.ItemMessagesRequestBuilderGetQueryParameters{
			Select: []string{"sender", "subject", "body"},
		}
		configuration := &graphusers.ItemMessagesRequestBuilderGetRequestConfiguration{
			QueryParameters: requestParameters,
			Headers:         headers,
		}
		messages, err := client.Me().Messages().Get(cmd.Context(), configuration)
		if err != nil {
			return err
		}
		for _, m := range messages.GetValue() {
			if *m.GetSender().GetEmailAddress().GetAddress() != rep {
				continue
			}
			ret.WriteString(rep)
			ret.WriteString("\n")
			ret.WriteString(*m.GetBody().GetContent())
			ret.WriteString("\n")
		}
	}

	me, err := client.Me().Get(cmd.Context(), nil)
	if err != nil {
		return err
	}

	configuration := &graphusers.ItemCalendarGetscheduleGetScheduleRequestBuilderPostRequestConfiguration{
		Headers: headers,
	}
	requestBody := graphusers.NewItemCalendarGetscheduleGetSchedulePostRequestBody()

	requestBody.SetSchedules([]string{
		*me.GetMail(),
	})
	start := time.Now().Format(time.RFC3339)
	end := time.Now().AddDate(0, 0, 7).Format(time.RFC3339)
	startTime := graphmodels.NewDateTimeTimeZone()
	startTime.SetDateTime(&start)
	timeZone := "Pacific Standard Time"
	startTime.SetTimeZone(&timeZone)
	requestBody.SetStartTime(startTime)
	endTime := graphmodels.NewDateTimeTimeZone()
	endTime.SetDateTime(&end)
	endTime.SetTimeZone(&timeZone)
	requestBody.SetEndTime(endTime)
	availabilityViewInterval := int32(60)
	requestBody.SetAvailabilityViewInterval(&availabilityViewInterval)

	schedules, err := client.Me().Calendar().GetSchedule().PostAsGetSchedulePostResponse(context.Background(), requestBody, configuration)
	if err != nil {
		return err
	}

	ret.WriteString("Organizer's schedule in next weeks\n")
	for _, s := range schedules.GetValue() {
		for _, item := range s.GetScheduleItems() {
			start := item.GetStart()
			start.SetTimeZone(&timeZone)
			end := item.GetEnd()
			end.SetTimeZone(&timeZone)
			ret.WriteString(fmt.Sprintf("Status: Busy, start: %v, end: %v\n", *start.GetDateTime(), *end.GetDateTime()))
		}
	}

	fmt.Println(ret.String())
	return nil
}
