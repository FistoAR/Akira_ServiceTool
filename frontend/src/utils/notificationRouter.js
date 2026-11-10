export function getNotificationTargetUrl(notification, currentUser) {
  const callNumber = notification.data?.callNumber;
  const type = notification.type;
  const title = (notification.title || '').toLowerCase();
  const message = (notification.message || '').toLowerCase();
  const escalatedTo = notification.data?.escalatedTo;

  if (type === 'Service Material') {
    return '/serviceMaterial';
  }

  if (!callNumber) {
    return '/serviceCallResponse';
  }

  const encodedCall = encodeURIComponent(callNumber);

  // Check if this notification is specifically informing the user that their call was escalated away to someone else
  // e.g.: "Call #SC-xxxx has been escalated to engineer1."
  const isEscalatedAwayFromMe = Boolean(
    escalatedTo ||
    (title.includes('call escalated') && !title.includes('sla breached') && !message.includes('to you') && (message.includes('has been escalated to') || message.includes('escalated to ')))
  );

  const isAdmin = currentUser?.role === 'Admin' || currentUser?.department === 'Admin' || currentUser?.role === 'admin';

  if (isEscalatedAwayFromMe) {
    // If the call was escalated away from me to another person, go to Service Call Entry / Escalations view
    if (isAdmin) {
      return `/serviceCall/escalations?search=${encodedCall}`;
    }
    return `/serviceCall?search=${encodedCall}`;
  }

  // Otherwise, the call belongs to this user! Direct them to ServiceCallResponse and pre-select the appropriate tab:
  let tab = 'escalation';

  if (title.includes('support') || message.includes('support requested') || message.includes('support resolved') || message.includes('support')) {
    tab = 'support';
  } else if (title.includes('field visit') || message.includes('field visit')) {
    tab = 'fieldvisit';
  } else if (title.includes('pending') || message.includes('pending')) {
    tab = 'pending';
  } else if (title.includes('self assigned') || message.includes('self assigned')) {
    tab = 'self_assigned';
  } else {
    // Normal assignment, 50% SLA warning, reverse escalation, or SLA breached escalation TO this user
    tab = 'escalation';
  }

  return `/serviceCallResponse?tab=${tab}&search=${encodedCall}`;
}
