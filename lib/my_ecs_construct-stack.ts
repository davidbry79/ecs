import * as cdk from 'aws-cdk-lib'
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as iam from 'aws-cdk-lib/aws-iam';
import { FargateTaskDefinition } from 'aws-cdk-lib/aws-ecs';
import { Construct } from 'constructs';
import { Vpc, VpcLookupOptions } from 'aws-cdk-lib/aws-ec2';


export class MyEcsConstructStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);



    /*Create the security group for the fargate cluster
    const clusterSecurityGroup = new ec2.SecurityGroup(this, 'secgroup_ecs_cluster', {
    vpc,
      Description: 'Allows traffic to test task from the ALB'
    });
    */

    //Lookup the required VPC

    const vpc = ec2.Vpc.fromLookup(this, 'EcsVpc', {
      vpcId: 'vpc-090b955b8018b1f7e'
    });

    //Deploy cluster

    const cluster = new ecs.Cluster(this, "network-cluster", {
      vpc,
      containerInsights: false,
      enableFargateCapacityProviders: true,
      //securityGroups: []
    });

    //Task defintion
    const fargateTask = new ecs.FargateTaskDefinition(this, 'ecs-task-def', {});

    const repo = cdk.aws_ecr.Repository.fromRepositoryName(this, 'repository', 'public.ecr.aws/amazonlinux/amazonlinux');

    const container = fargateTask.addContainer("web-app", {
      // image: ecs.ContainerImage.fromRegistry("amazon/amazon-ecs-sample"),
      image: ecs.ContainerImage.fromEcrRepository(repo, "latest"),
    });

    const mapping = container.addPortMappings({
      containerPort: 80,
      protocol: ecs.Protocol.TCP
    });


    /* //Task role
       const taskRole = new iam.Role(this, 'task-role', {
         assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
         roleName: "task-role",
         description: 'Role that api task defintions use to run the api code'
       });
     */

    /*
        taskRole.attachInlinePolicy(
          new iam.Policy(this, "task-policy", {
            statements: [
              // policies to allow access to other AWS services from within the container e.g SES (Simple Email Service)
              new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: [
                  'cloudwatch:DecribeAlarmsForMetric',
                  'cloudwatch:DecribeAlarmHistory',
                  'cloudwatch:DecribeAlarms',
                  'cloudwatch:ListMetrics',
                  'cloudwatch:GetMetricStatistics',
                  'cloudwatch:GetMetricData',
                  'ec2:DescribeTags',
                  'ec2:DescribeInstances',
                  'ec2:DescribeRegions',
                  'tag:Getresources',
                  'ecr:*',
                  'rds:*'
                ],
                resources: ["*"],
              }),
            ],
          })
        );
        
        */

    //Create security group and remove outbound rules
    // const albSecurityGroup = new ec2.SecurityGroup(this, 'secgroup_ecs_alb', {
    //   vpc,
    //   securityGroupName: 'secgroup_ecs_alb',
    //   description: 'Port and traffic restriction on public facing ecs albs',
    //   allowAllOutbound: false
    // });

    // albSecurityGroup.addIngressRule(ec2.Peer.ipv4('0.0.0.0/0'), ec2.Port.tcp(80), 'http from internet') 

    //Create the fargate service
    const service = new ecs.FargateService(this, 'ecs_service', {
      cluster: cluster,
      taskDefinition: fargateTask,
      desiredCount: 1,
      assignPublicIp: false,
      //securityGroups: [ecsSecurityGroup],
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED
      },
    });

    //Deploy and configure the ALB
    const lb = new elbv2.ApplicationLoadBalancer(this, 'ecs-alb', {
      // loadBalancerName: 'ecs-alb',
      internetFacing: true,
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC
      },
      // securityGroup: albSecurityGroup,
    });

    //Create the http ECS ALB target group
    // const targetGrouphttp = new elbv2.ApplicationTargetGroup(this, 'ecs_http_tg', {
    //   vpc,

    // });

    //Create the listner for the ALB
    const listener = lb.addListener('listener', {
      port: 80
    });

    listener.addTargets('ApplicationFargateFleet', {
      port: 80,
      targets: [service],
    });

    // //Add the target group
    // listener.addTargetGroups("targets", {
    //   targetGroups: [targetGrouphttp]
    // });

    //Attach the fargate service to the ALB

    //const attachService = new ecs.FargateService.Att(this. 'targetGrouphttp')
  }
}