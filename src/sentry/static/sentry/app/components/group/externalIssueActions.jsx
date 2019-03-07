import $ from 'jquery';
import React from 'react';
import PropTypes from 'prop-types';
import Modal from 'react-bootstrap/lib/Modal';
import queryString from 'query-string';
import styled from 'react-emotion';

import {addSuccessMessage, addErrorMessage} from 'app/actionCreators/indicator';
import AsyncComponent from 'app/components/asyncComponent';
import IssueSyncListElement, {IntegrationLink, IntegrationIcon} from 'app/components/issueSyncListElement';
import ExternalIssueForm, {SentryAppExternalIssueForm} from 'app/components/group/externalIssueForm';
import FieldFromConfig from 'app/views/settings/components/forms/fieldFromConfig';
import IntegrationItem from 'app/views/organizationIntegrations/integrationItem';
import Form from 'app/views/settings/components/forms/form';
import NavTabs from 'app/components/navTabs';
import SentryTypes from 'app/sentryTypes';
import {t} from 'app/locale';
import overflowEllipsis from 'app/styles/overflowEllipsis';
import space from 'app/styles/space';
import {debounce} from 'lodash';

class ExternalIssueActions extends AsyncComponent {
  static propTypes = {
    group: PropTypes.object.isRequired,
    integration: PropTypes.object.isRequired,
  };

  constructor(props, context) {
    super(props, context);

    this.state = {
      showModal: false,
      action: 'create',
      selectedIntegration: this.props.integration,
      issue: this.getIssue(),
      ...this.getDefaultState(),
    };
  }

  getEndpoints() {
    return [];
  }

  getIssue() {
    return this.props.integration && this.props.integration.externalIssues
      ? this.props.integration.externalIssues[0]
      : null;
  }

  deleteIssue(issueId) {
    const {group, integration} = this.props;
    const endpoint = `/groups/${group.id}/integrations/${integration.id}/?externalIssue=${issueId}`;
    this.api.request(endpoint, {
      method: 'DELETE',
      success: (data, _, jqXHR) => {
        addSuccessMessage(t('Successfully unlinked issue.'));
        this.setState({
          issue: null,
        });
      },
      error: error => {
        addErrorMessage(t('Unable to unlink issue.'));
      },
    });
  }

  openModal = () => {
    const {integration} = this.props;
    this.setState({
      showModal: true,
      selectedIntegration: integration,
      action: 'create',
    });
  };

  closeModal = data => {
    this.setState({
      showModal: false,
      action: null,
      issue: data && data.id ? data : null,
    });
  };

  handleClick = action => {
    this.setState({action});
  };

  renderBody() {
    const {action, selectedIntegration, issue} = this.state;
    const {group} = this.props;

    return (
      <React.Fragment>
        <IssueSyncListElement
          onOpen={this.openModal}
          externalIssueLink={issue ? issue.url : null}
          externalIssueId={issue ? issue.id : null}
          externalIssueKey={issue ? issue.key : null}
          externalIssueDisplayName={issue ? issue.displayName : null}
          onClose={this.deleteIssue.bind(this)}
          integrationType={selectedIntegration.provider.key}
          integrationName={selectedIntegration.name}
          hoverCardHeader={t('Linked %s Integration', selectedIntegration.provider.name)}
          hoverCardBody={
            issue && issue.title ? (
              <div>
                <IssueTitle>{issue.title}</IssueTitle>
                {issue.description && (
                  <IssueDescription>{issue.description}</IssueDescription>
                )}
              </div>
            ) : (
              <IntegrationItem integration={selectedIntegration} />
            )
          }
        />
        {selectedIntegration && (
          <Modal
            show={this.state.showModal}
            onHide={this.closeModal}
            animation={false}
            enforceFocus={false}
            backdrop="static"
          >
            <Modal.Header closeButton>
              <Modal.Title>{`${selectedIntegration.provider.name} Issue`}</Modal.Title>
            </Modal.Header>
            <NavTabs underlined={true}>
              <li className={action === 'create' ? 'active' : ''}>
                <a onClick={() => this.handleClick('create')}>{t('Create')}</a>
              </li>
              <li className={action === 'link' ? 'active' : ''}>
                <a onClick={() => this.handleClick('link')}>{t('Link')}</a>
              </li>
            </NavTabs>
            <Modal.Body>
              {action && (
                <ExternalIssueForm
                  // need the key here so React will re-render
                  // with a new action prop
                  key={action}
                  group={this.props.group}
                  integration={selectedIntegration}
                  action={action}
                  onSubmitSuccess={this.closeModal}
                />
              )}
            </Modal.Body>
          </Modal>
        )}
      </React.Fragment>
    );
  }
}

export class SentryAppExternalIssueActions extends React.Component {
  static propTypes = {
    group: PropTypes.object.isRequired,
    sentryAppComponent: PropTypes.object.isRequired,
    externalIssue: PropTypes.object,
  };

  constructor(props) {
    super(props);

    this.state = {
      action: 'create',
      showModal: false,
    };
  }

  openCreate = () => {
    this.setState({action: 'create'});
  }

  openLink = () => {
    this.setState({action: 'link'});
  }

  closeModal = () => {
    this.setState({showModal: false});
  }

  onClick = () => {
    if (!this.props.externalIssue) {
      this.setState({showModal: true});
    }
  }

  get link() {
    const {sentryAppComponent, externalIssue} = this.props;

    let url = '#';
    let displayName = `Link ${sentryAppComponent.sentryApp.name} Issue`;

    if (externalIssue) {
      url = externalIssue.url;
      displayName = externalIssue.displayName;
    }

    return (
      <React.Fragment>
        <IntegrationIcon src={`icon-github`} />
        <IntegrationLink onClick={this.onClick} href={url}>{displayName}</IntegrationLink>
      </React.Fragment>
    );
  }

  get modal() {
    const {sentryAppComponent, group} = this.props;
    const {action, showModal} = this.state;

    return (
      <Modal
        show={showModal}
        onHide={this.closeModal}
        animation={false}
      >
        <Modal.Header closeButton>
          <Modal.Title>{`${sentryAppComponent.sentryApp.name} Issue`}</Modal.Title>
        </Modal.Header>
        <NavTabs underlined={true}>
          <li className={action === 'create' ? 'active' : ''}>
            <a onClick={this.openCreate}>{t('Create')}</a>
          </li>
          <li className={action === 'link' ? 'active' : ''}>
            <a onClick={this.openLink}>{t('Link')}</a>
          </li>
        </NavTabs>
        <Modal.Body>
          <SentryAppExternalIssueForm
            group={group}
            sentryAppInstallation={{id: 1}}
            config={sentryAppComponent.schema}
            action={action}
          />
        </Modal.Body>
      </Modal>
    );
  }

  render() {
    const {group, sentryAppComponent, externalIssue} = this.props;

    return (
      <React.Fragment>
        {this.link}
        {this.modal}
      </React.Fragment>
    );
  }
}

const IssueTitle = styled('div')`
  font-size: 1.1em;
  font-weight: 600;
  ${overflowEllipsis};
`;

const IssueDescription = styled('div')`
  margin-top: ${space(1)};
  ${overflowEllipsis};
`;

export default ExternalIssueActions;
