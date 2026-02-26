import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Table, Tag, Button, Modal, Form, Input, Select, DatePicker, message } from 'antd';
import { PlusOutlined, TeamOutlined, ProjectOutlined, CalendarOutlined } from '@ant-design/icons';
import api from '../../api/axios';

const { Option } = Select;
const { TextArea } = Input;

const ProjectDashboard = ({ userRole }) => {
  console.log('🔍 ProjectDashboard userRole:', userRole);
  
  const [projects, setProjects] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [editingStatus, setEditingStatus] = useState(false);
  const [form] = Form.useForm();
  const [assignForm] = Form.useForm();

  // Fetch dashboard data
  useEffect(() => {
    fetchDashboardData();
    fetchUsers();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      console.log('🔍 Frontend: Calling /spc/dashboard...');
      const response = await api.get('/spc/dashboard');
      console.log('🔍 Frontend: Response received:', response.status);
      console.log('🔍 Frontend: Full response:', response);
      console.log('🔍 Frontend: Response data:', JSON.stringify(response.data, null, 2));
      console.log('🔍 Frontend: Response data success:', response.data.success);
      console.log('🔍 Frontend: Response data data:', response.data.data);
      
      if (response.data.success) {
        console.log('🔍 Frontend: Setting projects:', response.data.data.projects);
        setProjects(response.data.data.projects);
        setTeamMembers(response.data.data.teamMembers);
      } else {
        console.error('🔍 Frontend: API returned success=false:', response.data);
      }
    } catch (error) {
      console.error('🔍 Frontend: Error fetching dashboard data:', error);
      console.error('🔍 Frontend: Error response:', error.response?.data);
      message.error('Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await api.get('/user/all');
      if (response.data.success) {
        setUsers(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  // Filter users by role
  const managers = users.filter(user => user.role === 'manager' || user.role === 'company_admin');
  const hrs = users.filter(user => user.role === 'hr');
  const employees = users.filter(user => user.role === 'employee');

  console.log('🔍 Users by role:', { 
    total: users.length, 
    managers: managers.length, 
    hrs: hrs.length, 
    employees: employees.length 
  });

  const handleCreateProject = async (values) => {
    try {
      setLoading(true);
      const response = await api.post('/spc/projects', values);
      
      if (response.data.success) {
        message.success('Project created successfully');
        setCreateModalVisible(false);
        form.resetFields();
        fetchDashboardData();
      }
    } catch (error) {
      message.error('Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignUsers = async (values) => {
    try {
      const projectId = selectedProject?._id || selectedProject?.id;
      
      if (!projectId) {
        message.error('Project ID not found');
        return;
      }
      
      console.log('🔍 Assigning users to project:', { projectId, selectedProject });
      console.log('🔍 Assignment values:', values);
      
      setLoading(true);
      const response = await api.post(`/spc/projects/${projectId}/assign`, values);
      
      console.log('🔍 Assignment response:', response.data);
      
      if (response.data.success) {
        message.success('Users assigned successfully');
        setAssignModalVisible(false);
        assignForm.resetFields();
        fetchDashboardData();
      }
    } catch (error) {
      console.error('❌ Assignment error:', error);
      message.error('Failed to assign users');
    } finally {
      setLoading(false);
    }
  };

  const openAssignModal = (project) => {
    const projectId = project._id || project.id;
    console.log('🔍 Opening assign modal for project:', { project, projectId });
    
    if (!projectId) {
      message.error('Project ID not found');
      return;
    }
    
    setSelectedProject({ ...project, _id: projectId });
    assignForm.setFieldsValue({
      assignedManagers: project.assignedManagers || [],
      assignedHRs: project.assignedHRs || []
    });
    setAssignModalVisible(true);
  };

  const openDetailsModal = async (project) => {
    const projectId = project._id || project.id;
    
    if (!projectId) {
      message.error('Project ID not found');
      return;
    }
    
    try {
      setLoading(true);
      const response = await api.get(`/spc/projects/${projectId}`);
      
      if (response.data.success) {
        setSelectedProject(response.data.data);
        setDetailsModalVisible(true);
      }
    } catch (error) {
      message.error('Failed to fetch project details');
    } finally {
      setLoading(false);
    }
  };

  const closeDetailsModal = () => {
    setDetailsModalVisible(false);
    setSelectedProject(null);
    setEditingStatus(false);
  };

  const handleStatusUpdate = async (newStatus) => {
    try {
      const projectId = selectedProject?._id || selectedProject?.id;
      
      if (!projectId) {
        message.error('Project ID not found');
        return;
      }
      
      console.log('🔍 Updating project status:', { projectId, newStatus });
      
      setLoading(true);
      const response = await api.put(`/spc/projects/${projectId}`, { status: newStatus });
      
      console.log('🔍 Status update response:', response.data);
      
      if (response.data.success) {
        message.success('Project status updated successfully');
        setSelectedProject({ ...selectedProject, status: newStatus });
        setEditingStatus(false);
        fetchDashboardData(); // Refresh the projects list
      }
    } catch (error) {
      console.error('❌ Status update error:', error);
      message.error('Failed to update project status');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to get user name by ID
  const getUserName = (userId) => {
    const user = users.find(u => (u._id === userId || u.id === userId));
    return user ? `${user.firstName} ${user.lastName}` : userId;
  };

  const getProjectStatusColor = (status) => {
    const colors = {
      active: 'green',
      completed: 'blue',
      'on-hold': 'orange',
      cancelled: 'red'
    };
    return colors[status] || 'default';
  };

  const getProjectPriorityColor = (priority) => {
    const colors = {
      low: 'blue',
      medium: 'orange',
      high: 'red',
      critical: 'purple'
    };
    return colors[priority] || 'default';
  };

  const projectColumns = [
    {
      title: 'Project Name',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <div>
          <strong>{text}</strong>
          <br />
          <small>{record.description}</small>
        </div>
      )
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={getProjectStatusColor(status)}>
          {status?.toUpperCase()}
        </Tag>
      )
    },
    {
      title: 'Priority',
      dataIndex: 'priority',
      key: 'priority',
      render: (priority) => (
        <Tag color={getProjectPriorityColor(priority)}>
          {priority?.toUpperCase()}
        </Tag>
      )
    },
    {
      title: 'Timeline',
      key: 'timeline',
      render: (record) => (
        <div>
          <CalendarOutlined /> {record.startDate ? new Date(record.startDate).toLocaleDateString() : 'N/A'}
          <br />
          <small>to {record.endDate ? new Date(record.endDate).toLocaleDateString() : 'No end date'}</small>
          {record.contractId && (
            <div>
              <small style={{ color: '#52c41a' }}>📄 From Contract</small>
            </div>
          )}
          {record.jobPostingId && (
            <div>
              <small style={{ color: '#1890ff' }}>💼 From Job Posting</small>
            </div>
          )}
        </div>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (record) => {
        const projectId = record._id || record.id;
        const isAdmin = userRole === 'company_admin' || userRole === 'admin';
        return (
          <div>
            {isAdmin && (
              <Button 
                size="small" 
                onClick={() => openAssignModal(record)}
                style={{ marginRight: 8 }}
              >
                Assign Team
              </Button>
            )}
            <Button 
              size="small" 
              type="primary"
              onClick={() => openDetailsModal(record)}
              disabled={!projectId}
            >
              View Details
            </Button>
          </div>
        );
      }
    }
  ];

  const teamColumns = [
    {
      title: 'Team Member',
      dataIndex: 'email',
      key: 'email',
      render: (text, record) => (
        <div>
          <strong>{record.firstName} {record.lastName}</strong>
          <br />
          <small>{text}</small>
        </div>
      )
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      render: (role) => (
        <Tag color={role === 'manager' ? 'blue' : role === 'hr' ? 'green' : 'default'}>
          {role?.toUpperCase()}
        </Tag>
      )
    }
  ];

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <Row justify="space-between" align="middle" style={{ marginBottom: '24px' }}>
        <Col>
          <h1>Project Dashboard</h1>
          <p>Manage your projects and team assignments</p>
        </Col>
        {userRole === 'company_admin' && (
          <Col>
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={() => setCreateModalVisible(true)}
            >
              Create Project
            </Button>
          </Col>
        )}
      </Row>

      {/* Statistics */}
      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Projects"
              value={projects.length}
              prefix={<ProjectOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Active Projects"
              value={projects.filter(p => p.status === 'active').length}
              prefix={<ProjectOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Team Members"
              value={teamMembers.length}
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Your Role"
              value={userRole?.replace('_', ' ').toUpperCase()}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Projects Table */}
      <Card 
        title="Your Projects" 
        style={{ marginBottom: '24px' }}
        extra={
          (() => {
            const isAdmin = userRole === 'company_admin' || userRole === 'admin';
            console.log('🔍 Checking button visibility:', { userRole, isAdmin });
            return isAdmin && (
              <Button 
                type="primary" 
                icon={<PlusOutlined />}
                onClick={() => {
                  console.log('🔍 Create Project button clicked');
                  console.log('🔍 Current modal state:', createModalVisible);
                  setCreateModalVisible(true);
                  console.log('🔍 Modal state set to true');
                }}
              >
                Create Project
              </Button>
            );
          })()
        }
      >
        <Table
          columns={projectColumns}
          dataSource={projects}
          loading={loading}
          rowKey={(record) => record._id || record.id}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {/* Team Members */}
      <Card title="Your Team Members">
        <Table
          columns={teamColumns}
          dataSource={teamMembers}
          loading={loading}
          rowKey="_id"
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {/* Create Project Modal */}
      <Modal
        title="Create New Project"
        open={createModalVisible}
        onCancel={() => {
          console.log('🔍 Modal cancelled');
          setCreateModalVisible(false);
        }}
        footer={null}
        width={600}
        zIndex={1000}
      >
        {console.log('🔍 Modal is rendering, visible:', createModalVisible)}
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateProject}
        >
          <Form.Item
            name="name"
            label="Project Name"
            rules={[{ required: true, message: 'Please enter project name' }]}
          >
            <Input placeholder="Enter project name" />
          </Form.Item>

          <Form.Item
            name="description"
            label="Description"
            rules={[{ required: true, message: 'Please enter project description' }]}
          >
            <TextArea rows={3} placeholder="Enter project description" />
          </Form.Item>

          <Form.Item
            name="priority"
            label="Priority"
            rules={[{ required: true, message: 'Please select priority' }]}
          >
            <Select placeholder="Select priority">
              <Option value="low">Low</Option>
              <Option value="medium">Medium</Option>
              <Option value="high">High</Option>
              <Option value="critical">Critical</Option>
            </Select>
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="startDate"
                label="Start Date"
                rules={[{ required: true, message: 'Please select start date' }]}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="endDate"
                label="End Date"
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="budget"
            label="Budget Allocation"
          >
            <Input type="number" placeholder="Enter budget amount" />
          </Form.Item>

          <Form.Item
            name="contractId"
            label="Link to Contract (Optional)"
          >
            <Select 
              placeholder="Select contract to link (will use contract dates as timeline)"
              allowClear
              showSearch
              filterOption={(input, option) =>
                option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
              }
            >
              {/* This would be populated with available contracts */}
              <Option value="">No contract</Option>
            </Select>
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              Create Project
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* Assign Users Modal */}
      <Modal
        title={`Assign Team to ${selectedProject?.name}`}
        open={assignModalVisible}
        onCancel={() => setAssignModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form
          form={assignForm}
          layout="vertical"
          onFinish={handleAssignUsers}
        >
          <Form.Item
            name="assignedManagers"
            label="Assign Managers"
          >
            <Select
              mode="multiple"
              placeholder="Select managers"
              allowClear
            >
              {managers.map(manager => (
                <Option key={manager._id} value={manager._id}>
                  {manager.firstName} {manager.lastName} ({manager.email})
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="assignedHRs"
            label="Assign HRs"
          >
            <Select
              mode="multiple"
              placeholder="Select HRs"
              allowClear
            >
              {hrs.map(hr => (
                <Option key={hr._id} value={hr._id}>
                  {hr.firstName} {hr.lastName} ({hr.email})
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              Assign Team
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* Project Details Modal */}
      <Modal
        title="Project Details"
        open={detailsModalVisible}
        onCancel={closeDetailsModal}
        footer={[
          <Button key="close" onClick={closeDetailsModal}>
            Close
          </Button>
        ]}
        width={800}
      >
        {selectedProject && (
          <div>
            {console.log('🔍 Frontend: Selected project data:', selectedProject)}
            <Row gutter={16}>
              <Col span={12}>
                <p><strong>Project Name:</strong> {selectedProject.name}</p>
              </Col>
              <Col span={12}>
                <p><strong>Status:</strong></p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {!editingStatus ? (
                    <>
                      <Tag color={getProjectStatusColor(selectedProject.status)}>
                        {selectedProject.status?.toUpperCase()}
                      </Tag>
                      {(userRole === 'company_admin' || userRole === 'admin') && (
                        <Button 
                          size="small" 
                          onClick={() => setEditingStatus(true)}
                        >
                          Change Status
                        </Button>
                      )}
                    </>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Select
                        defaultValue={selectedProject.status}
                        style={{ width: 120 }}
                        onChange={(value) => handleStatusUpdate(value)}
                        loading={loading}
                      >
                        <Option value="active">Active</Option>
                        <Option value="completed">Completed</Option>
                        <Option value="on-hold">On Hold</Option>
                        <Option value="cancelled">Cancelled</Option>
                      </Select>
                      <Button 
                        size="small" 
                        onClick={() => setEditingStatus(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  )}
                </div>
              </Col>
            </Row>
            
            <Row gutter={16}>
              <Col span={12}>
                <p><strong>Priority:</strong> <Tag color={getProjectPriorityColor(selectedProject.priority)}>{selectedProject.priority?.toUpperCase()}</Tag></p>
              </Col>
              <Col span={12}>
                <p><strong>Budget:</strong> ${selectedProject.budget || 'N/A'}</p>
              </Col>
            </Row>

            <p><strong>Description:</strong></p>
            <p>{selectedProject.description || 'No description available'}</p>

            <Row gutter={16}>
              <Col span={12}>
                <p><strong>Start Date:</strong> {selectedProject.startDate ? new Date(selectedProject.startDate).toLocaleDateString() : 'N/A'}</p>
              </Col>
              <Col span={12}>
                <p><strong>End Date:</strong> {selectedProject.endDate ? new Date(selectedProject.endDate).toLocaleDateString() : 'No end date'}</p>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <p><strong>Created:</strong> {selectedProject.createdAt ? new Date(selectedProject.createdAt).toLocaleDateString() : 'N/A'}</p>
              </Col>
              <Col span={12}>
                <p><strong>Last Updated:</strong> {selectedProject.updatedAt ? new Date(selectedProject.updatedAt).toLocaleDateString() : 'N/A'}</p>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <p><strong>Assigned Managers:</strong></p>
                <div>
                  {console.log('🔍 Frontend: Assigned managers:', selectedProject.assignedManagers)}
                  {selectedProject.assignedManagers && selectedProject.assignedManagers.length > 0 
                    ? selectedProject.assignedManagers.map(managerId => (
                        <Tag key={managerId} color="blue">
                          {typeof managerId === 'string' 
                            ? getUserName(managerId)
                            : `${managerId.firstName} ${managerId.lastName}`
                          }
                        </Tag>
                      ))
                    : <span>No managers assigned</span>
                  }
                </div>
              </Col>
              <Col span={12}>
                <p><strong>Assigned HRs:</strong></p>
                <div>
                  {console.log('🔍 Frontend: Assigned HRs:', selectedProject.assignedHRs)}
                  {selectedProject.assignedHRs && selectedProject.assignedHRs.length > 0 
                    ? selectedProject.assignedHRs.map(hrId => (
                        <Tag key={hrId} color="green">
                          {typeof hrId === 'string' 
                            ? getUserName(hrId)
                            : `${hrId.firstName} ${hrId.lastName}`
                          }
                        </Tag>
                      ))
                    : <span>No HRs assigned</span>
                  }
                </div>
              </Col>
            </Row>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ProjectDashboard;
