import { Component } from '@angular/core';
import { PublishFeedbackService } from '../../services/publish-feedback.service';

// Keep the feedback separate from the form that closes after Publish.
@Component({
  selector: 'app-publish-feedback',
  templateUrl: './publish-feedback.component.html',
  styleUrl: './publish-feedback.component.css',
})
export class PublishFeedbackComponent {
  constructor(public feedback: PublishFeedbackService) {}
}
